/**
 * Progress Polling Endpoint
 *
 * REST API endpoint that provides progress data for transcription jobs.
 * Serves as a fallback when Server-Sent Events are not available.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { progressTrackerManager } from "@/lib/db/progress-tracker";
import {
  apiError,
  apiSuccess,
  apiNotFound,
  apiBadRequest,
} from "@/lib/utils/api-response";
import { handleError } from "@/lib/utils/error-handler";
import type { ProgressUpdate } from "@/types/progress";

// Validation schemas
const progressQuerySchema = z.object({
  // Mobile optimization parameters
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

  // Response optimization
  includeStages: z.coerce.boolean().optional().default(true),
  includeMobileOptimizations: z.coerce.boolean().optional().default(true),
  includePerformanceMetrics: z.coerce.boolean().optional().default(true),
  compactResponse: z.coerce.boolean().optional().default(false),

  // Polling optimization
  pollInterval: z.coerce.number().min(1000).max(30000).optional().default(2000),
  maxAge: z.coerce.number().min(1000).max(60000).optional().default(5000), // Cache time in ms
});

// Mobile optimization configurations
const MOBILE_RESPONSE_CONFIGS = {
  desktop: {
    maxResponseSize: 2048, // bytes
    includeFullStages: true,
    includeDetailedMetrics: true,
    defaultPollInterval: 2000, // 2 seconds
  },
  mobile: {
    maxResponseSize: 1024, // bytes - reduced for mobile
    includeFullStages: false, // Reduced stage details
    includeDetailedMetrics: false, // Minimal metrics
    defaultPollInterval: 5000, // 5 seconds - less frequent
  },
  tablet: {
    maxResponseSize: 1536, // bytes - medium size
    includeFullStages: true,
    includeDetailedMetrics: false, // Some metrics
    defaultPollInterval: 3000, // 3 seconds
  },
};

// Helper function to validate query parameters
function validateProgressQueryParams(searchParams: Record<string, string>) {
  const validatedQuery = progressQuerySchema.safeParse(searchParams);
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
      error: apiBadRequest("Invalid request parameters", issues),
    };
  }
  return { success: true as const, data: validatedQuery.data };
}

// Helper function to get mobile-optimized response config
function getMobileResponseConfig(
  deviceType: string,
  isLowPowerMode: boolean,
  networkType: string,
) {
  const baseConfig =
    MOBILE_RESPONSE_CONFIGS[
      deviceType as keyof typeof MOBILE_RESPONSE_CONFIGS
    ] || MOBILE_RESPONSE_CONFIGS.desktop;

  // Apply additional optimizations for low power mode
  if (isLowPowerMode) {
    return {
      ...baseConfig,
      maxResponseSize: Math.floor(baseConfig.maxResponseSize * 0.7), // 30% smaller
      includeFullStages: false,
      includeDetailedMetrics: false,
      defaultPollInterval: baseConfig.defaultPollInterval * 2, // Double the interval
    };
  }

  // Apply optimizations for cellular networks
  if (networkType === "cellular") {
    return {
      ...baseConfig,
      maxResponseSize: Math.floor(baseConfig.maxResponseSize * 0.8), // 20% smaller
      defaultPollInterval: Math.max(baseConfig.defaultPollInterval, 4000), // At least 4 seconds
    };
  }

  return baseConfig;
}

// Helper function to optimize response for mobile
function optimizeResponseForMobile(
  progress: ProgressUpdate,
  config: ReturnType<typeof getMobileResponseConfig>,
  includeStages: boolean,
  includeMobileOptimizations: boolean,
  includePerformanceMetrics: boolean,
  compactResponse: boolean,
) {
  // Create a copy to modify
  const optimized = { ...progress };

  // Always include essential fields
  const essentialFields = [
    "jobId",
    "fileId",
    "status",
    "overallProgress",
    "currentStage",
    "message",
    "timestamp",
  ];

  // Remove non-essential fields if compact response is requested
  if (compactResponse) {
    Object.keys(optimized).forEach((key) => {
      if (!essentialFields.includes(key)) {
        delete (optimized as any)[key];
      }
    });
  }

  // Optimize stage information
  if (includeStages && optimized.stages && !config.includeFullStages) {
    // Include only essential stage progress
    const optimizedStages: any = {};

    Object.keys(optimized.stages).forEach((stageKey) => {
      const stage =
        optimized.stages![stageKey as keyof typeof optimized.stages];
      if (stage) {
        optimizedStages[stageKey] = {
          progress: stage.progress,
        };

        // Include ETA only for current stage if available
        if (stageKey === optimized.currentStage && "eta" in stage) {
          optimizedStages[stageKey].eta = stage.eta;
        }
      }
    });

    optimized.stages = optimizedStages;
  }

  // Optimize mobile optimizations
  if (
    includeMobileOptimizations &&
    optimized.mobileOptimizations &&
    !config.includeDetailedMetrics
  ) {
    optimized.mobileOptimizations = {
      connectionType: optimized.mobileOptimizations.connectionType,
      isLowPowerMode: optimized.mobileOptimizations.isLowPowerMode,
    };
  }

  // Optimize performance metrics
  if (includePerformanceMetrics && !config.includeDetailedMetrics) {
    // Keep only essential performance data
    if (optimized.processingTime !== undefined) {
      // Keep processing time but remove other detailed metrics
    }
  }

  return optimized;
}

// Helper function to calculate cache headers based on progress status
function getCacheHeaders(progress: ProgressUpdate, maxAge: number) {
  // Less caching for active jobs, more for completed/failed jobs
  const cacheTime =
    progress.status === "completed" || progress.status === "failed"
      ? maxAge * 4 // 4x cache time for completed jobs
      : maxAge;

  return {
    "Cache-Control": `private, max-age=${Math.floor(cacheTime / 1000)}`,
    ETag: `"${progress.jobId}-${progress.timestamp}-${progress.overallProgress}"`,
  };
}

/**
 * GET /api/progress/jobs/[jobId]
 *
 * Retrieves current progress information for a transcription job.
 * This endpoint is optimized for mobile devices and serves as a REST API
 * fallback when Server-Sent Events are not available.
 *
 * Query Parameters:
 * - deviceType: Device type ("desktop", "mobile", "tablet", default: "desktop")
 * - networkType: Network type ("wifi", "cellular", "unknown", default: "unknown")
 * - batteryLevel: Battery level (0-1, optional)
 * - isLowPowerMode: Whether device is in low power mode (default: false)
 * - includeStages: Include detailed stage information (default: true)
 * - includeMobileOptimizations: Include mobile optimization data (default: true)
 * - includePerformanceMetrics: Include performance metrics (default: true)
 * - compactResponse: Return compact response with minimal data (default: false)
 * - pollInterval: Suggested polling interval for client (1000-30000ms, default: 2000)
 * - maxAge: Maximum cache age for response (1000-60000ms, default: 5000)
 *
 * Response Format:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "string",
 *     "fileId": number,
 *     "status": "uploading|processing|completed|failed",
 *     "overallProgress": number,
 *     "currentStage": "string",
 *     "message": "string",
 *     "timestamp": number,
 *     "stages": { ... },
 *     "mobileOptimizations": { ... },
 *     "performanceMetrics": { ... },
 *     "suggestedPollInterval": number
 *   },
 *   "timestamp": "string"
 * }
 * ```
 *
 * Error Response Format:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human readable error message",
 *     "details": { ... }
 *   },
 *   "timestamp": "string"
 * }
 * ```
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
      return apiBadRequest("Job ID is required and must be a valid string");
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const queryValidation = validateProgressQueryParams(searchParams);

    if (!queryValidation.success) {
      return queryValidation.error;
    }

    const {
      deviceType,
      networkType,
      batteryLevel,
      isLowPowerMode,
      includeStages,
      includeMobileOptimizations,
      includePerformanceMetrics,
      compactResponse,
      pollInterval,
      maxAge,
    } = queryValidation.data;

    // Get mobile-optimized configuration
    const config = getMobileResponseConfig(
      deviceType,
      isLowPowerMode,
      networkType,
    );

    // Try to get progress tracker for the job
    let tracker;
    try {
      tracker = await progressTrackerManager.getTrackerByJobId(jobId);
      if (!tracker) {
        return apiNotFound(
          "No progress tracker found for the specified job ID",
          { jobId },
        );
      }
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return apiError(handleError(dbError, "ProgressEndpoint.getTracker"));
    }

    // Get current progress
    let progress: ProgressUpdate;
    try {
      progress = tracker.getCurrentProgress();

      // Update tracker connection health for polling connections
      tracker.updateConnectionHealth("healthy", Date.now() - startTime);

      // Update device information if provided
      const entity = tracker.getEntity();
      if (
        !entity.deviceInfo &&
        (deviceType || networkType || batteryLevel !== undefined)
      ) {
        // In a real implementation, you might update the device info
        // For now, we'll just use it for response optimization
      }
    } catch (progressError) {
      console.error("Error getting progress:", progressError);
      return apiError(
        handleError(progressError, "ProgressEndpoint.getProgress"),
      );
    }

    // Optimize response for mobile
    const optimizedProgress = optimizeResponseForMobile(
      progress,
      config,
      includeStages,
      includeMobileOptimizations,
      includePerformanceMetrics,
      compactResponse,
    );

    // Calculate suggested polling interval based on job status and device
    let suggestedPollInterval = pollInterval;
    if (progress.status === "completed" || progress.status === "failed") {
      // No need to poll frequently for completed jobs
      suggestedPollInterval = Math.max(pollInterval, 30000); // At least 30 seconds
    } else if (isLowPowerMode) {
      // Reduce polling frequency in low power mode
      suggestedPollInterval = pollInterval * 2;
    } else if (networkType === "cellular") {
      // Reduce polling frequency on cellular networks
      suggestedPollInterval = Math.max(pollInterval, 4000);
    }

    // Prepare response data
    const responseData = {
      ...optimizedProgress,
      // Add optimization metadata
      suggestedPollInterval,
      responseOptimizations: {
        deviceType,
        networkType,
        isLowPowerMode,
        compactResponse,
        maxResponseSize: config.maxResponseSize,
      },
    };

    // Get cache headers
    const cacheHeaders = getCacheHeaders(progress, maxAge);

    // Create successful response with custom headers
    const response = apiSuccess(responseData, 200);

    // Add custom headers
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("Error in progress polling endpoint:", error);
    return apiError(handleError(error, "ProgressEndpoint.general"));
  }
}

/**
 * HEAD /api/progress/jobs/[jobId]
 *
 * Check if a job exists without retrieving the full progress data.
 * Returns only headers with minimal information about the job status.
 *
 * Headers:
 * - X-Job-Status: The current status of the job
 * - X-Job-Progress: The overall progress percentage (0-100)
 * - X-Job-Stage: The current processing stage
 * - X-Suggested-Poll-Interval: Suggested polling interval in milliseconds
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  try {
    // Validate job ID
    if (!jobId || typeof jobId !== "string" || jobId.trim().length === 0) {
      return new NextResponse(null, { status: 400 });
    }

    // Parse query parameters for optimization
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const queryValidation = validateProgressQueryParams(searchParams);

    if (!queryValidation.success) {
      return new NextResponse(null, { status: 400 });
    }

    const { deviceType, networkType, isLowPowerMode, pollInterval } =
      queryValidation.data;

    // Get mobile-optimized configuration
    const config = getMobileResponseConfig(
      deviceType,
      isLowPowerMode,
      networkType,
    );

    // Try to get progress tracker for the job
    let tracker;
    try {
      tracker = await progressTrackerManager.getTrackerByJobId(jobId);
      if (!tracker) {
        return new NextResponse(null, { status: 404 });
      }
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return new NextResponse(null, { status: 503 });
    }

    // Get current progress (minimal data)
    try {
      const progress = tracker.getCurrentProgress();

      // Calculate suggested polling interval
      let suggestedPollInterval = pollInterval;
      if (progress.status === "completed" || progress.status === "failed") {
        suggestedPollInterval = Math.max(pollInterval, 30000);
      } else if (isLowPowerMode) {
        suggestedPollInterval = pollInterval * 2;
      }

      // Return headers only
      const headers = {
        "X-Job-Status": progress.status,
        "X-Job-Progress": progress.overallProgress.toString(),
        "X-Job-Stage": progress.currentStage,
        "X-Suggested-Poll-Interval": suggestedPollInterval.toString(),
        "X-Job-Timestamp": progress.timestamp.toString(),
        "Cache-Control": `private, max-age=${Math.floor(config.defaultPollInterval / 1000)}`,
        ETag: `"${progress.jobId}-${progress.timestamp}-${progress.overallProgress}"`,
      };

      return new NextResponse(null, {
        status: 200,
        headers,
      });
    } catch (progressError) {
      console.error("Error getting progress for HEAD:", progressError);
      return new NextResponse(null, { status: 500 });
    }
  } catch (error) {
    console.error("Error in progress HEAD endpoint:", error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * OPTIONS /api/progress/jobs/[jobId]
 *
 * Handle CORS preflight requests for the progress polling endpoint.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
