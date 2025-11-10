/**
 * Server-Sent Events for Real-time Progress Streaming
 *
 * This endpoint provides real-time progress updates using Server-Sent Events (SSE) technology.
 * It handles connection management, mobile optimizations, and provides robust error handling.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { progressTrackerManager } from "@/lib/db/progress-tracker";
import type { ProgressUpdate } from "@/types/progress";

// Validation schemas
const streamQuerySchema = z.object({
  updateInterval: z.coerce
    .number()
    .min(1000)
    .max(30000)
    .optional()
    .default(2000),
  connectionType: z
    .enum(["sse", "polling", "periodic"])
    .optional()
    .default("sse"),
  deviceType: z
    .enum(["desktop", "mobile", "tablet"])
    .optional()
    .default("desktop"),
  networkType: z
    .enum(["wifi", "cellular", "unknown"])
    .optional()
    .default("unknown"),
  batteryLevel: z.coerce.number().min(0).max(1).optional(),
  isLowPowerMode: z.coerce.boolean().optional().default(false),
});

// Mobile optimization configurations
const MOBILE_CONFIGS = {
  desktop: {
    updateInterval: 2000, // 2 seconds
    retryAttempts: 3,
    timeout: 300000, // 5 minutes
  },
  mobile: {
    updateInterval: 5000, // 5 seconds (reduced frequency)
    retryAttempts: 5, // More retries for unstable connections
    timeout: 600000, // 10 minutes (longer timeout)
  },
  tablet: {
    updateInterval: 3000, // 3 seconds
    retryAttempts: 4,
    timeout: 450000, // 7.5 minutes
  },
};

// SSE Event types
const SSE_EVENTS = {
  PROGRESS: "progress",
  STAGE_CHANGE: "stageChange",
  ERROR: "error",
  COMPLETE: "complete",
  CONNECTION_HEALTH: "connectionHealth",
  PING: "ping", // Keep-alive event
} as const;

// Helper function to validate query parameters
function validateStreamQueryParams(searchParams: Record<string, string>) {
  const validatedQuery = streamQuerySchema.safeParse(searchParams);
  if (!validatedQuery.success) {
    const issues = validatedQuery.error.issues.reduce(
      (acc, issue, index) => {
        acc[`issue_${index}`] = {
          code: issue.code,
          message: issue.message,
          path: issue.path.join("."),
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );
    return {
      success: false as const,
      error: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters",
          details: issues,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
  return { success: true as const, data: validatedQuery.data };
}

// Helper function to format SSE data
function formatSSEEvent(event: string, data: unknown, id?: string): string {
  const lines = [];

  // Event type
  if (event) {
    lines.push(`event: ${event}`);
  }

  // Event ID
  if (id) {
    lines.push(`id: ${id}`);
  }

  // Data (support multi-line data)
  const dataStr = JSON.stringify(data);
  dataStr.split("\n").forEach((line) => {
    lines.push(`data: ${line}`);
  });

  // End of event
  lines.push(""); // Empty line to mark end of event

  return lines.join("\n");
}

// Helper function to get mobile-optimized config
function getMobileConfig(deviceType: string, isLowPowerMode: boolean) {
  const baseConfig =
    MOBILE_CONFIGS[deviceType as keyof typeof MOBILE_CONFIGS] ||
    MOBILE_CONFIGS.desktop;

  // Apply additional optimizations for low power mode
  if (isLowPowerMode) {
    return {
      ...baseConfig,
      updateInterval: baseConfig.updateInterval * 2, // Double the interval
      timeout: baseConfig.timeout * 1.5, // Longer timeout
    };
  }

  return baseConfig;
}

/**
 * GET /api/progress/jobs/[jobId]/stream
 *
 * Establishes a Server-Sent Events connection for real-time progress updates.
 *
 * Query Parameters:
 * - updateInterval: Update frequency in milliseconds (1000-30000, default: 2000)
 * - connectionType: Type of connection ("sse", "polling", "periodic", default: "sse")
 * - deviceType: Device type ("desktop", "mobile", "tablet", default: "desktop")
 * - networkType: Network type ("wifi", "cellular", "unknown", default: "unknown")
 * - batteryLevel: Battery level (0-1, optional)
 * - isLowPowerMode: Whether device is in low power mode (default: false)
 *
 * Response Format:
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache
 * - Connection: keep-alive
 *
 * Event Types:
 * - progress: Progress update with stage information
 * - stageChange: When processing stage changes
 * - error: Error information
 * - complete: When processing is complete
 * - connectionHealth: Connection health status
 * - ping: Keep-alive event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const startTime = Date.now();
  const { jobId } = params;

  try {
    // Validate job ID
    if (!jobId || typeof jobId !== "string" || jobId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JOB_ID",
            message: "Job ID is required and must be a valid string",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const queryValidation = validateStreamQueryParams(searchParams);

    if (!queryValidation.success) {
      return NextResponse.json(queryValidation.error, { status: 400 });
    }

    const {
      updateInterval,
      connectionType,
      deviceType,
      networkType,
      batteryLevel,
      isLowPowerMode,
    } = queryValidation.data;

    // Get mobile-optimized configuration
    const config = getMobileConfig(deviceType, isLowPowerMode);

    // Try to get progress tracker for the job
    let tracker;
    try {
      tracker = await progressTrackerManager.getTrackerByJobId(jobId);
      if (!tracker) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "JOB_NOT_FOUND",
              message: "No progress tracker found for the specified job ID",
              details: { jobId },
            },
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        );
      }
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to connect to the database",
            details: {
              error:
                dbError instanceof Error ? dbError.message : String(dbError),
              jobId,
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let isStreamActive = true;
    let lastEventId = request.headers.get("last-event-id");
    let pingTimer: NodeJS.Timeout | null = null;
    let updateTimer: NodeJS.Timeout | null = null;
    let connectionTimeout: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        console.log(`SSE stream started for job ${jobId}`, {
          deviceType,
          networkType,
          updateInterval: config.updateInterval,
          timestamp: new Date().toISOString(),
        });

        // Send initial connection event
        const initialEvent = formatSSEEvent(
          SSE_EVENTS.CONNECTION_HEALTH,
          {
            status: "connected",
            jobId,
            deviceType,
            networkType,
            updateInterval: config.updateInterval,
            timestamp: Date.now(),
          },
          "connection-established",
        );
        controller.enqueue(encoder.encode(initialEvent));

        // Send current progress immediately
        const currentProgress = tracker.getCurrentProgress();
        const progressEvent = formatSSEEvent(
          SSE_EVENTS.PROGRESS,
          currentProgress,
          `progress-${Date.now()}`,
        );
        controller.enqueue(encoder.encode(progressEvent));

        // Update tracker connection health
        tracker.updateConnectionHealth("healthy", Date.now() - startTime);

        // Setup periodic progress updates
        const sendProgressUpdate = () => {
          if (!isStreamActive) return;

          try {
            const progress = tracker.getCurrentProgress();
            const event = formatSSEEvent(
              SSE_EVENTS.PROGRESS,
              progress,
              `progress-${Date.now()}`,
            );
            controller.enqueue(encoder.encode(event));

            // Update connection health
            tracker.updateConnectionHealth("healthy");
          } catch (error) {
            console.error("Error sending progress update:", error);
            const errorEvent = formatSSEEvent(
              SSE_EVENTS.ERROR,
              {
                code: "PROGRESS_UPDATE_ERROR",
                message: "Failed to get progress update",
                details: {
                  error: error instanceof Error ? error.message : String(error),
                  jobId,
                },
                timestamp: Date.now(),
              },
              `error-${Date.now()}`,
            );
            controller.enqueue(encoder.encode(errorEvent));
          }
        };

        // Setup periodic pings to keep connection alive
        const setupPingTimer = () => {
          if (pingTimer) {
            clearInterval(pingTimer);
          }

          pingTimer = setInterval(() => {
            if (!isStreamActive) {
              clearInterval(pingTimer!);
              return;
            }

            const pingEvent = formatSSEEvent(
              SSE_EVENTS.PING,
              {
                timestamp: Date.now(),
                jobId,
              },
              `ping-${Date.now()}`,
            );
            controller.enqueue(encoder.encode(pingEvent));
          }, 30000); // Send ping every 30 seconds
        };

        // Setup progress update timer
        const setupUpdateTimer = () => {
          if (updateTimer) {
            clearInterval(updateTimer);
          }

          updateTimer = setInterval(() => {
            if (!isStreamActive) {
              clearInterval(updateTimer!);
              return;
            }

            sendProgressUpdate();
          }, config.updateInterval);
        };

        // Setup connection timeout
        const setupConnectionTimeout = () => {
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }

          connectionTimeout = setTimeout(() => {
            if (!isStreamActive) return;

            console.log(`Connection timeout for job ${jobId}`);
            const timeoutEvent = formatSSEEvent(
              SSE_EVENTS.ERROR,
              {
                code: "CONNECTION_TIMEOUT",
                message: "Connection timed out due to inactivity",
                details: {
                  jobId,
                  timeout: config.timeout,
                },
                timestamp: Date.now(),
              },
              `timeout-${Date.now()}`,
            );
            controller.enqueue(encoder.encode(timeoutEvent));
            controller.close();
          }, config.timeout);
        };

        // Setup event listeners on the tracker
        const onProgress = (progress: ProgressUpdate) => {
          if (!isStreamActive) return;

          const event = formatSSEEvent(
            SSE_EVENTS.PROGRESS,
            progress,
            `progress-${Date.now()}`,
          );
          controller.enqueue(encoder.encode(event));

          // Reset connection timeout on activity
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            setupConnectionTimeout();
          }
        };

        const onStageChange = (stage: string, previousStage: string) => {
          if (!isStreamActive) return;

          const event = formatSSEEvent(
            SSE_EVENTS.STAGE_CHANGE,
            {
              jobId,
              currentStage: stage,
              previousStage,
              timestamp: Date.now(),
            },
            `stage-change-${Date.now()}`,
          );
          controller.enqueue(encoder.encode(event));
        };

        const onComplete = () => {
          if (!isStreamActive) return;

          const event = formatSSEEvent(
            SSE_EVENTS.COMPLETE,
            {
              jobId,
              completedAt: Date.now(),
              totalDuration: Date.now() - startTime,
            },
            `complete-${Date.now()}`,
          );
          controller.enqueue(encoder.encode(event));

          // Close stream after completion
          setTimeout(() => {
            if (isStreamActive) {
              controller.close();
            }
          }, 1000); // Give client time to receive the completion event
        };

        const onError = (error: Error) => {
          if (!isStreamActive) return;

          const event = formatSSEEvent(
            SSE_EVENTS.ERROR,
            {
              code: "TRACKER_ERROR",
              message: "Progress tracker encountered an error",
              details: {
                error: error.message,
                stack:
                  process.env.NODE_ENV !== "production"
                    ? error.stack
                    : undefined,
                jobId,
              },
              timestamp: Date.now(),
            },
            `tracker-error-${Date.now()}`,
          );
          controller.enqueue(encoder.encode(event));
        };

        // Register event listeners
        tracker.on("progress", onProgress);
        tracker.on("stageChange", onStageChange);
        tracker.on("complete", onComplete);
        tracker.on("error", onError);

        // Setup timers
        setupPingTimer();
        setupUpdateTimer();
        setupConnectionTimeout();

        // Cleanup function
        const cleanup = () => {
          isStreamActive = false;

          // Clear timers
          if (pingTimer) clearInterval(pingTimer);
          if (updateTimer) clearInterval(updateTimer);
          if (connectionTimeout) clearTimeout(connectionTimeout);

          // Remove event listeners
          tracker.on("progress", () => {});
          tracker.on("stageChange", () => {});
          tracker.on("complete", () => {});
          tracker.on("error", () => {});

          // Update connection health
          tracker.updateConnectionHealth("disconnected");

          console.log(`SSE stream cleanup completed for job ${jobId}`);
        };

        // Handle stream controller close
        controller.onclose = cleanup;

        // Make cleanup available for external calls
        (controller as any)._cleanup = cleanup;
      },

      cancel() {
        isStreamActive = false;
        if (pingTimer) clearInterval(pingTimer);
        if (updateTimer) clearInterval(updateTimer);
        if (connectionTimeout) clearTimeout(connectionTimeout);

        if (tracker) {
          tracker.updateConnectionHealth("disconnected");
        }

        console.log(`SSE stream cancelled for job ${jobId}`);
      },
    });

    // Return SSE response with proper headers
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID",
        "Access-Control-Expose-Headers": "Last-Event-ID",
      },
    });
  } catch (error) {
    console.error("Error in progress streaming endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error in progress streaming",
          details: {
            error: error instanceof Error ? error.message : String(error),
            jobId,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/progress/jobs/[jobId]/stream
 *
 * Handle CORS preflight requests for SSE connections.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID",
      "Access-Control-Max-Age": "86400",
    },
  });
}
