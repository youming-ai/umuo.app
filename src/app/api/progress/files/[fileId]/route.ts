import { type NextRequest, NextResponse } from "next/server";
import { getServerProgress } from "@/lib/ai/server-progress";
import {
  withEnhancedErrorHandling,
  defaultMiddlewareConfig,
} from "@/lib/api/api-middleware-wrapper";
import type { EnhancedRequestContext } from "@/lib/api/api-middleware-wrapper";
import { apiSuccess } from "@/lib/utils/api-response";

export const GET = withEnhancedErrorHandling(
  async function enhancedProgressHandler(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> },
    context?: EnhancedRequestContext,
  ): Promise<NextResponse> {
    const resolvedParams = await params;
    const fileId = parseInt(resolvedParams.fileId, 10);

    if (Number.isNaN(fileId)) {
      throw new Error(`Invalid file ID: ${resolvedParams.fileId}`);
    }

    const progress = await getServerProgress(fileId);

    if (!progress) {
      throw new Error(`No progress found for file ID: ${fileId}`);
    }

    return apiSuccess({
      progress,
      // Add mobile optimization information
      mobile_optimized: true,
      // Add request context information
      request_context: {
        device_type: context?.deviceInfo?.device_type,
        request_id: context?.metadata.requestId,
        session_id: context?.metadata.sessionId,
        processing_time: Date.now() - (context?.startTime || Date.now()),
      },
      // Add progress-specific metadata
      metadata: {
        file_id: fileId,
        timestamp: new Date().toISOString(),
        endpoint: "progress",
      },
    });
  },
  {
    ...defaultMiddlewareConfig,
    // Progress-specific configuration
    enableMobileOptimizations: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    enableTimeoutProtection: true,
    requestTimeoutMs: 10000, // 10 seconds for progress check
    enableRateLimiting: true,
    maxRequestsPerMinute: 120, // Higher limit for progress polling
    enableResponseCaching: true, // Enable caching for progress requests
    customContext: {
      customData: {
        feature: "progress_tracking",
        service: "server_progress",
        endpoint: "progress",
      },
    },
  },
);
