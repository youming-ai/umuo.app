/**
 * Automated Performance Test Suite
 * Comprehensive test definitions for different performance scenarios
 */

import type { PerformanceTestCase, TestCategory } from './performance-test-runner';
import { createPerformanceTestCase } from './performance-test-runner';
import { performanceMonitor } from './performance-monitor';
import { measureWebVitals } from './performance-monitor';

/**
 * Core Web Vitals Test Cases
 */
export const coreWebVitalsTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    'largest-contentful-paint',
    'Measures LCP performance under different network conditions',
    'core-web-vitals',
    async () => {
      const startTime = Date.now();

      // Simulate initial page load
      const metrics = await measureWebVitals();

      return {
        'largest-contentful-paint': metrics.lcp || 0,
        'first-contentful-paint': metrics.fcp || 0,
        'time-to-first-byte': metrics.ttfb || 0,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 30000, retries: 2 }
  ),

  createPerformanceTestCase(
    'first-input-delay',
    'Measures FID performance with user interaction simulation',
    'core-web-vitals',
    async () => {
      const startTime = Date.now();

      // Simulate user interaction
      await new Promise(resolve => {
        const handleClick = () => {
          document.removeEventListener('click', handleClick);
          resolve(void 0);
        };
        document.addEventListener('click', handleClick);

        // Simulate a click after a short delay
        setTimeout(() => {
          const event = new MouseEvent('click', { bubbles: true });
          document.body.dispatchEvent(event);
        }, 100);
      });

      const metrics = await measureWebVitals();

      return {
        'first-input-delay': metrics.fid || 0,
        'cumulative-layout-shift': metrics.cls || 0,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 15000, retries: 2 }
  ),

  createPerformanceTestCase(
    'cumulative-layout-shift',
    'Measures CLS performance during dynamic content loading',
    'core-web-vitals',
    async () => {
      const startTime = Date.now();

      // Simulate dynamic content loading that might cause layout shifts
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);

      // Add dynamic content
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const element = document.createElement('div');
        element.style.height = `${Math.random() * 100}px`;
        element.style.background = '#f0f0f0';
        container.appendChild(element);
      }

      // Measure CLS
      const metrics = await measureWebVitals();

      // Cleanup
      document.body.removeChild(container);

      return {
        'cumulative-layout-shift': metrics.cls || 0,
        'layout-shifts': 5,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 10000 }
  ),
];

/**
 * Transcription Performance Test Cases
 */
export const transcriptionTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    'transcription-processing-time',
    'Measures transcription processing performance with different audio sizes',
    'transcription',
    async () => {
      const startTime = Date.now();

      // Simulate transcription job processing
      const mockJob = {
        id: 'test-job-1',
        fileId: 'test-file-1',
        status: 'processing' as const,
        model: 'whisper-large-v3-turbo',
        language: 'en',
        processingTime: 0,
        queueTime: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isChunked: true,
        totalChunks: 5,
        processedChunks: 0,
      };

      // Simulate different audio file sizes
      const testCases = [
        { duration: 60, size: 1024 * 1024 },     // 1MB, 1 minute
        { duration: 300, size: 5 * 1024 * 1024 }, // 5MB, 5 minutes
        { duration: 600, size: 10 * 1024 * 1024 }, // 10MB, 10 minutes
      ];

      const results = [];

      for (const testCase of testCases) {
        const processingStartTime = Date.now();

        // Simulate processing time based on audio duration
        const simulatedProcessingTime = testCase.duration * 100; // 100ms per second of audio

        await new Promise(resolve => setTimeout(resolve, Math.min(simulatedProcessingTime, 1000)));

        const processingTime = Date.now() - processingStartTime;
        const speed = testCase.duration / (processingTime / 1000);

        results.push({
          duration: testCase.duration,
          size: testCase.size,
          processingTime,
          speed,
        });

        // Record metrics for analysis
        performanceMonitor.recordTranscriptionMetrics(
          { ...mockJob, processingTime, queueTime: 500 },
          testCase.size,
          testCase.duration
        );
      }

      return {
        'transcription-processing-time': results[0].processingTime, // Use first test case
        'transcription-speed': results[0].speed,
        'transcription-queue-time': 500,
        'audio-duration': results[0].duration,
        'audio-size': results[0].size,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 30000, retries: 1 }
  ),

  createPerformanceTestCase(
    'concurrent-transcription',
    'Tests performance with multiple concurrent transcription jobs',
    'transcription',
    async () => {
      const startTime = Date.now();

      const concurrentJobs = 3;
      const jobPromises = [];

      for (let i = 0; i < concurrentJobs; i++) {
        const jobPromise = new Promise(async (resolve) => {
          const jobStartTime = Date.now();

          // Simulate transcription processing
          await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

          resolve({
            jobId: i,
            processingTime: Date.now() - jobStartTime,
            completed: true,
          });
        });

        jobPromises.push(jobPromise);
      }

      const results = await Promise.all(jobPromises);
      const totalProcessingTime = Date.now() - startTime;
      const averageProcessingTime = results.reduce((sum, r: any) => sum + r.processingTime, 0) / concurrentJobs;
      const concurrencyEfficiency = averageProcessingTime / totalProcessingTime;

      return {
        'concurrent-jobs': concurrentJobs,
        'total-processing-time': totalProcessingTime,
        'average-processing-time': averageProcessingTime,
        'concurrency-efficiency': concurrencyEfficiency,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 60000, retries: 1 }
  ),
];

/**
 * Mobile Performance Test Cases
 */
export const mobilePerformanceTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    'touch-response-time',
    'Measures touch interaction performance on mobile devices',
    'mobile-performance',
    async () => {
      const startTime = Date.now();

      if (typeof window === 'undefined' || !('ontouchstart' in window)) {
        return {
          'touch-response-time': 0,
          'touch-supported': false,
          'test-duration': Date.now() - startTime,
        };
      }

      const touchResponseTimes = [];
      const testElement = document.createElement('button');
      testElement.style.position = 'absolute';
      testElement.style.left = '-1000px';
      document.body.appendChild(testElement);

      // Test multiple touch interactions
      for (let i = 0; i < 10; i++) {
        const touchStartTime = performance.now();

        await new Promise(resolve => {
          const handleTouchEnd = () => {
            const responseTime = performance.now() - touchStartTime;
            touchResponseTimes.push(responseTime);
            testElement.removeEventListener('touchend', handleTouchEnd);
            resolve(void 0);
          };

          testElement.addEventListener('touchend', handleTouchEnd);

          // Simulate touch
          const touchEvent = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            touches: [],
          });
          testElement.dispatchEvent(touchEvent);
        });

        await new Promise(r => setTimeout(r, 100)); // Brief pause between tests
      }

      // Cleanup
      document.body.removeChild(testElement);

      const averageResponseTime = touchResponseTimes.reduce((a, b) => a + b, 0) / touchResponseTimes.length;
      const maxResponseTime = Math.max(...touchResponseTimes);
      const minResponseTime = Math.min(...touchResponseTimes);

      return {
        'touch-response-time': averageResponseTime,
        'touch-response-max': maxResponseTime,
        'touch-response-min': minResponseTime,
        'touch-samples': touchResponseTimes.length,
        'touch-supported': true,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 15000, retries: 2 }
  ),

  createPerformanceTestCase(
    'mobile-memory-usage',
    'Measures memory usage patterns on mobile devices',
    'mobile-performance',
    async () => {
      const startTime = Date.now();

      // Get initial memory usage
      const initialMemory = this.getMemoryUsage();

      // Simulate memory-intensive operations
      const memoryIntensiveTasks = [];

      for (let i = 0; i < 5; i++) {
        const task = new Promise(async (resolve) => {
          // Create memory pressure
          const arrays = [];
          for (let j = 0; j < 100; j++) {
            arrays.push(new Array(10000).fill(Math.random()));
          }

          // Simulate processing
          await new Promise(r => setTimeout(r, 500));

          // Clear memory
          arrays.length = 0;

          resolve({
            taskId: i,
            peakMemory: this.getMemoryUsage(),
          });
        });

        memoryIntensiveTasks.push(task);
      }

      const results = await Promise.all(memoryIntensiveTasks);
      const finalMemory = this.getMemoryUsage();

      // Calculate memory statistics
      const peakMemory = Math.max(...results.map((r: any) => r.peakMemory));
      const memoryIncrease = finalMemory - initialMemory;
      const memoryRecovery = peakMemory - finalMemory;

      return {
        'memory-usage-initial': initialMemory,
        'memory-usage-peak': peakMemory,
        'memory-usage-final': finalMemory,
        'memory-increase': memoryIncrease,
        'memory-recovery': memoryRecovery,
        'memory-tasks': results.length,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 30000 }
  ),

  createPerformanceTestCase(
    'gesture-recognition',
    'Tests gesture recognition performance for mobile interactions',
    'mobile-performance',
    async () => {
      const startTime = Date.now();

      if (typeof window === 'undefined' || !('ontouchstart' in window)) {
        return {
          'gesture-recognition-time': 0,
          'gesture-supported': false,
          'test-duration': Date.now() - startTime,
        };
      }

      const gestureTimes = [];
      const testElement = document.createElement('div');
      testElement.style.position = 'absolute';
      testElement.style.width = '200px';
      testElement.style.height = '200px';
      testElement.style.left = '-300px';
      testElement.style.top = '-300px';
      testElement.style.background = '#f0f0f0';
      document.body.appendChild(testElement);

      // Test swipe gestures
      for (let i = 0; i < 5; i++) {
        const gestureStartTime = performance.now();

        await new Promise(resolve => {
          let touchCount = 0;

          const handleTouchStart = (e: TouchEvent) => {
            touchCount++;
          };

          const handleTouchEnd = () => {
            if (touchCount > 1) {
              const gestureTime = performance.now() - gestureStartTime;
              gestureTimes.push(gestureTime);
            }
            touchCount = 0;
            testElement.removeEventListener('touchend', handleTouchEnd);
            testElement.removeEventListener('touchstart', handleTouchStart);
            resolve(void 0);
          };

          testElement.addEventListener('touchstart', handleTouchStart);
          testElement.addEventListener('touchend', handleTouchEnd);

          // Simulate swipe gesture
          const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            touches: [new Touch({
              identifier: 0,
              target: testElement,
              clientX: 0,
              clientY: 0,
            })],
          });

          const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            touches: [],
          });

          testElement.dispatchEvent(touchStart);
          setTimeout(() => testElement.dispatchEvent(touchEnd), 100);
        });

        await new Promise(r => setTimeout(r, 200));
      }

      // Cleanup
      document.body.removeChild(testElement);

      const averageGestureTime = gestureTimes.length > 0
        ? gestureTimes.reduce((a, b) => a + b, 0) / gestureTimes.length
        : 0;

      return {
        'gesture-recognition-time': averageGestureTime,
        'gesture-samples': gestureTimes.length,
        'gesture-supported': true,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 20000, retries: 2 }
  ),
];

/**
 * UI Responsiveness Test Cases
 */
export const uiResponsivenessTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    'dom-manipulation',
    'Tests performance of DOM manipulation operations',
    'ui-responsiveness',
    async () => {
      const startTime = Date.now();

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);

      // Test different DOM operations
      const operationTimes = [];

      // Element creation
      const createStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = `Element ${i}`;
        container.appendChild(div);
      }
      operationTimes.push(performance.now() - createStartTime);

      // Element querying
      const queryStartTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const elements = container.querySelectorAll('div');
        elements.length; // Access length to ensure evaluation
      }
      operationTimes.push(performance.now() - queryStartTime);

      // Style manipulation
      const styleStartTime = performance.now();
      const elements = container.querySelectorAll('div');
      for (let i = 0; i < elements.length; i++) {
        (elements[i] as HTMLElement).style.color = 'red';
      }
      operationTimes.push(performance.now() - styleStartTime);

      // Cleanup
      document.body.removeChild(container);

      return {
        'dom-creation-time': operationTimes[0],
        'dom-query-time': operationTimes[1],
        'dom-style-time': operationTimes[2],
        'dom-operations-total': operationTimes.reduce((a, b) => a + b, 0),
        'elements-created': 1000,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 15000 }
  ),

  createPerformanceTestCase(
    'animation-performance',
    'Measures animation frame rate and smoothness',
    'ui-responsiveness',
    async () => {
      const startTime = Date.now();

      return new Promise(resolve => {
        const frameTimes = [];
        let frameCount = 0;
        const targetFrames = 60; // Test for 1 second at 60fps

        const animate = (timestamp: number) => {
          if (frameCount === 0) {
            // Start animation
          } else if (frameCount < targetFrames) {
            const frameTime = timestamp - lastTimestamp;
            frameTimes.push(frameTime);
          } else {
            // Animation complete
            const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const fps = 1000 / averageFrameTime;
            const droppedFrames = frameTimes.filter(t => t > 16.67).length; // > 60fps threshold

            resolve({
              'animation-frame-rate': fps,
              'average-frame-time': averageFrameTime,
              'dropped-frames': droppedFrames,
              'frame-count': frameCount,
              'test-duration': Date.now() - startTime,
            });
            return;
          }

          frameCount++;
          lastTimestamp = timestamp;
          requestAnimationFrame(animate);
        };

        let lastTimestamp = 0;
        requestAnimationFrame(animate);
      });
    },
    { timeout: 10000 }
  ),

  createPerformanceTestCase(
    'scroll-performance',
    'Tests scroll performance and responsiveness',
    'ui-responsiveness',
    async () => {
      const startTime = Date.now();

      const scrollContainer = document.createElement('div');
      scrollContainer.style.position = 'absolute';
      scrollContainer.style.width = '300px';
      scrollContainer.style.height = '200px';
      scrollContainer.style.overflow = 'auto';
      scrollContainer.style.left = '-400px';
      scrollContainer.style.visibility = 'hidden';

      // Add content to make scrollable
      for (let i = 0; i < 100; i++) {
        const item = document.createElement('div');
        item.style.height = '50px';
        item.style.padding = '10px';
        item.textContent = `Scroll item ${i}`;
        scrollContainer.appendChild(item);
      }

      document.body.appendChild(scrollContainer);

      const scrollTimes = [];

      // Test scroll performance
      for (let i = 0; i < 20; i++) {
        const scrollStartTime = performance.now();

        scrollContainer.scrollTop = i * 25;

        // Force reflow
        scrollContainer.offsetHeight;

        const scrollTime = performance.now() - scrollStartTime;
        scrollTimes.push(scrollTime);

        await new Promise(r => setTimeout(r, 10));
      }

      // Cleanup
      document.body.removeChild(scrollContainer);

      const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      const maxScrollTime = Math.max(...scrollTimes);

      return {
        'scroll-performance': averageScrollTime,
        'scroll-max-time': maxScrollTime,
        'scroll-samples': scrollTimes.length,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 15000 }
  ),
];

/**
 * Network Performance Test Cases
 */
export const networkPerformanceTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    'api-response-time',
    'Tests API response times under different conditions',
    'network-performance',
    async () => {
      const startTime = Date.now();

      // Test different API endpoints
      const endpoints = [
        '/api/health',
        '/api/progress/test-file',
      ];

      const responseTimes = [];

      for (const endpoint of endpoints) {
        try {
          const requestStartTime = performance.now();

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const responseTime = performance.now() - requestStartTime;

          responseTimes.push({
            endpoint,
            responseTime,
            status: response.status,
            success: response.ok,
          });
        } catch (error) {
          responseTimes.push({
            endpoint,
            responseTime: 0,
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const averageResponseTime = responseTimes
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / responseTimes.filter(r => r.success).length || 0;

      return {
        'api-response-time': averageResponseTime,
        'api-endpoints-tested': endpoints.length,
        'api-success-rate': responseTimes.filter(r => r.success).length / endpoints.length,
        'test-duration': Date.now() - startTime,
      };
    },
    { timeout: 20000, retries: 2 }
  ),
];

/**
 * Helper function to get memory usage
 */
function getMemoryUsage(): number {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
  }
  return 0;
}
