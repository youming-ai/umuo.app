/**
 * Test script for Server-Sent Events (SSE) Progress Streaming
 *
 * This script can be used to test the SSE endpoint implementation.
 * Run it with: tsx src/lib/test/sse-test.ts
 */

// Example usage:
/*
import { EventSource } from 'eventsource';

const testSSE = () => {
  const jobId = 'test-job-123';
  const eventSource = new EventSource(
    `/api/progress/jobs/${jobId}/stream?deviceType=mobile&updateInterval=3000`
  );

  eventSource.onopen = () => {
    console.log('SSE connection opened');
  };

  eventSource.addEventListener('progress', (event) => {
    const data = JSON.parse(event.data);
    console.log('Progress update:', data);
  });

  eventSource.addEventListener('stageChange', (event) => {
    const data = JSON.parse(event.data);
    console.log('Stage changed:', data);
  });

  eventSource.addEventListener('complete', (event) => {
    const data = JSON.parse(event.data);
    console.log('Transcription completed:', data);
    eventSource.close();
  });

  eventSource.addEventListener('error', (event) => {
    console.error('SSE error:', event);
    eventSource.close();
  });

  eventSource.addEventListener('ping', (event) => {
    const data = JSON.parse(event.data);
    console.log('Ping received:', data);
  });

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
  };

  // Close connection after 5 minutes for testing
  setTimeout(() => {
    console.log('Closing connection after timeout');
    eventSource.close();
  }, 300000);
};

// Run the test
testSSE();
*/

export interface SSETestOptions {
  jobId: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  networkType?: "wifi" | "cellular" | "unknown";
  updateInterval?: number;
  isLowPowerMode?: boolean;
}

export const createSSETestURL = (
  baseUrl: string,
  options: SSETestOptions,
): string => {
  const params = new URLSearchParams();

  if (options.deviceType) params.append("deviceType", options.deviceType);
  if (options.networkType) params.append("networkType", options.networkType);
  if (options.updateInterval)
    params.append("updateInterval", options.updateInterval.toString());
  if (options.isLowPowerMode !== undefined)
    params.append("isLowPowerMode", options.isLowPowerMode.toString());

  return `${baseUrl}/api/progress/jobs/${options.jobId}/stream?${params.toString()}`;
};

// Test configurations for different scenarios
export const SSE_TEST_CONFIGS = {
  // Desktop with standard settings
  desktop: {
    deviceType: "desktop" as const,
    networkType: "wifi" as const,
    updateInterval: 2000,
    isLowPowerMode: false,
  },

  // Mobile with cellular connection
  mobile: {
    deviceType: "mobile" as const,
    networkType: "cellular" as const,
    updateInterval: 5000,
    isLowPowerMode: false,
  },

  // Mobile with low power mode
  mobileLowPower: {
    deviceType: "mobile" as const,
    networkType: "wifi" as const,
    updateInterval: 10000,
    isLowPowerMode: true,
  },

  // Tablet device
  tablet: {
    deviceType: "tablet" as const,
    networkType: "wifi" as const,
    updateInterval: 3000,
    isLowPowerMode: false,
  },
} as const;

// Expected SSE event types
export const SSE_EVENT_TYPES = {
  PROGRESS: "progress",
  STAGE_CHANGE: "stageChange",
  ERROR: "error",
  COMPLETE: "complete",
  CONNECTION_HEALTH: "connectionHealth",
  PING: "ping",
} as const;

// Sample test data
export const SAMPLE_PROGRESS_UPDATE = {
  jobId: "test-job-123",
  fileId: 1,
  status: "processing" as const,
  overallProgress: 45,
  currentStage: "transcription",
  message: "Processing chunk 3 of 10",
  timestamp: Date.now(),
  stages: {
    upload: {
      progress: 100,
      speed: 1024000,
      eta: 0,
      bytesTransferred: 1048576,
      totalBytes: 1048576,
    },
    transcription: {
      progress: 45,
      currentChunk: 3,
      totalChunks: 10,
      eta: 120,
    },
    "post-processing": {
      progress: 0,
      segmentsProcessed: 0,
      totalSegments: 0,
    },
  },
};

export const SAMPLE_STAGE_CHANGE = {
  jobId: "test-job-123",
  currentStage: "post-processing",
  previousStage: "transcription",
  timestamp: Date.now(),
};

export const SAMPLE_ERROR = {
  code: "TRANSCRIPTION_ERROR",
  message: "Failed to process audio chunk",
  details: {
    chunkIndex: 5,
    error: "Audio format not supported",
    retryCount: 2,
  },
  timestamp: Date.now(),
};

export const SAMPLE_COMPLETE = {
  jobId: "test-job-123",
  completedAt: Date.now(),
  totalDuration: 120000, // 2 minutes
};

/**
 * Validate SSE event format
 */
export const validateSSEEvent = (event: MessageEvent): boolean => {
  try {
    if (!event.type || !event.data) {
      return false;
    }

    const data = JSON.parse(event.data);

    // Basic validation for common event types
    switch (event.type) {
      case SSE_EVENT_TYPES.PROGRESS:
        return (
          typeof data.jobId === "string" &&
          typeof data.fileId === "number" &&
          typeof data.overallProgress === "number" &&
          typeof data.currentStage === "string" &&
          typeof data.timestamp === "number"
        );

      case SSE_EVENT_TYPES.STAGE_CHANGE:
        return (
          typeof data.jobId === "string" &&
          typeof data.currentStage === "string" &&
          typeof data.previousStage === "string" &&
          typeof data.timestamp === "number"
        );

      case SSE_EVENT_TYPES.ERROR:
        return (
          typeof data.code === "string" &&
          typeof data.message === "string" &&
          typeof data.timestamp === "number"
        );

      case SSE_EVENT_TYPES.COMPLETE:
        return (
          typeof data.jobId === "string" &&
          typeof data.completedAt === "number" &&
          typeof data.totalDuration === "number"
        );

      case SSE_EVENT_TYPES.PING:
        return (
          typeof data.jobId === "string" && typeof data.timestamp === "number"
        );

      default:
        return true; // Allow unknown event types
    }
  } catch (error) {
    console.error("Error validating SSE event:", error);
    return false;
  }
};

/**
 * Performance metrics for SSE testing
 */
export interface SSEPerformanceMetrics {
  connectionTime: number;
  firstEventTime: number;
  eventCount: number;
  totalDataReceived: number;
  averageLatency: number;
  connectionErrors: number;
  reconnections: number;
}

/**
 * Test SSE performance
 */
export const testSSEPerformance = async (
  url: string,
  duration: number = 60000,
): Promise<SSEPerformanceMetrics> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const metrics: SSEPerformanceMetrics = {
      connectionTime: 0,
      firstEventTime: 0,
      eventCount: 0,
      totalDataReceived: 0,
      averageLatency: 0,
      connectionErrors: 0,
      reconnections: 0,
    };

    const eventSource = new EventSource(url);
    const latencies: number[] = [];

    eventSource.onopen = () => {
      metrics.connectionTime = Date.now() - startTime;
      console.log(`SSE connection opened in ${metrics.connectionTime}ms`);
    };

    eventSource.onmessage = (event) => {
      const eventTime = Date.now();
      const latency = eventTime - startTime;

      if (metrics.firstEventTime === 0) {
        metrics.firstEventTime = eventTime - startTime;
      }

      metrics.eventCount++;
      metrics.totalDataReceived += event.data.length;
      latencies.push(latency);

      // Validate event format
      if (!validateSSEEvent(event)) {
        console.warn("Invalid SSE event format:", event);
      }
    };

    eventSource.onerror = () => {
      metrics.connectionErrors++;
      console.error("SSE connection error");
    };

    // End test after specified duration
    setTimeout(() => {
      eventSource.close();

      // Calculate average latency (only for the last half of events to account for warm-up)
      const relevantLatencies = latencies.slice(
        Math.floor(latencies.length / 2),
      );
      metrics.averageLatency =
        relevantLatencies.length > 0
          ? relevantLatencies.reduce((sum, lat) => sum + lat, 0) /
            relevantLatencies.length
          : 0;

      resolve(metrics);
    }, duration);
  });
};

// Export default test configuration
export default {
  createSSETestURL,
  SSE_TEST_CONFIGS,
  SSE_EVENT_TYPES,
  SAMPLE_PROGRESS_UPDATE,
  SAMPLE_STAGE_CHANGE,
  SAMPLE_ERROR,
  SAMPLE_COMPLETE,
  validateSSEEvent,
  testSSEPerformance,
};
