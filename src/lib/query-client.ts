/**
 * Enhanced TanStack Query configuration for transcription optimization
 */

import { QueryClient, defaultOptions } from "@tanstack/react-query";

// Enhanced query key factory for optimization features
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) =>
    [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "progress"] as const,
  detailedProgress: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "detailed-progress"] as const,
  chunks: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "chunks"] as const,
  performance: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "performance"] as const,
};

export const jobKeys = {
  all: ["jobs"] as const,
  queue: () => [...jobKeys.all, "queue"] as const,
  active: () => [...jobKeys.all, "active"] as const,
  completed: () => [...jobKeys.all, "completed"] as const,
  forId: (jobId: string) => [...jobKeys.all, "id", jobId] as const,
};

export const mobileKeys = {
  all: ["mobile"] as const,
  interactions: (sessionId?: string) =>
    [...mobileKeys.all, "interactions", sessionId].filter(Boolean) as const,
  deviceInfo: () => [...mobileKeys.all, "device-info"] as const,
  performance: () => [...mobileKeys.all, "performance"] as const,
};

export const progressKeys = {
  all: ["progress"] as const,
  forJob: (jobId: string) => [...progressKeys.all, "job", jobId] as const,
  forFile: (fileId: number) => [...progressKeys.all, "file", fileId] as const,
  active: () => [...progressKeys.all, "active"] as const,
};

// Enhanced query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimization: shorter stale time for progress data
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        if (error?.status === 404 || error?.status === 401) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Enhanced configuration for progress tracking
      select: (data) => {
        // Transform data for optimal rendering
        return {
          ...data,
          // Add computed properties
          isActive:
            data?.status === "processing" || data?.status === "uploading",
          isCompleted: data?.status === "completed",
          hasError: data?.status === "failed",
          // Format timestamps
          formattedCreatedAt: data?.createdAt
            ? new Date(data.createdAt).toLocaleString()
            : undefined,
        };
      },
    },
    mutations: {
      // Optimistic updates for better UX
      onMutate: async (variables) => {
        // Cancel any ongoing queries for this mutation
        await queryClient.cancelQueries({ queryKey: transcriptionKeys.all });

        return variables;
      },
      onError: (error, variables, context) => {
        // Error handling with context
        console.error("Mutation error:", error);

        // Optionally show toast notification
        // toast.error(`Error: ${error.message}`);
      },
      onSuccess: (data, variables, context) => {
        // Success handling
        // Invalidate related queries
        if (variables?.fileId) {
          queryClient.invalidateQueries({
            queryKey: transcriptionKeys.forFile(variables.fileId),
          });
        }
      },
      onSettled: () => {
        // Always invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: transcriptionKeys.all });
      },
    },
  },
});

// Progress tracking query hook factory
export const createProgressQueryOptions = (jobId: string) => ({
  queryKey: progressKeys.forJob(jobId),
  queryFn: async () => {
    const response = await fetch(`/api/progress/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch progress");
    }
    return response.json();
  },
  refetchInterval: (data) => {
    // Dynamic polling based on status
    if (!data) return 2000; // Poll every 2 seconds if no data
    if (data.status === "processing" || data.status === "uploading") {
      return 2000; // Fast updates during active processing
    }
    if (data.status === "completed" || data.status === "failed") {
      return false; // Stop polling when complete
    }
    return 5000; // Slower polling for other states
  },
  refetchIntervalInBackground: true,
  staleTime: 1500, // Slightly shorter than refetch interval
  enabled: !!jobId,
});

// Mobile performance query hook factory
export const createMobilePerformanceQueryOptions = () => ({
  queryKey: mobileKeys.performance(),
  queryFn: async () => {
    const response = await fetch("/api/mobile/analytics/performance");
    if (!response.ok) {
      throw new Error("Failed to fetch mobile performance data");
    }
    return response.json();
  },
  refetchInterval: 30 * 1000, // Refetch every 30 seconds
  staleTime: 25 * 1000, // Consider stale after 25 seconds
});

// Enhanced error boundary for query errors
export class QueryErrorBoundary extends Error {
  constructor(
    public message: string,
    public queryKey?: string[],
    public retryCount?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "QueryErrorBoundary";
  }
}

// Utility functions for query management
export const queryUtils = {
  // Invalidate all transcription-related queries
  invalidateTranscriptionQueries: () => {
    queryClient.invalidateQueries({ queryKey: transcriptionKeys.all });
  },

  // Invalidate progress queries for specific file
  invalidateProgressQueries: (fileId: number) => {
    queryClient.invalidateQueries({
      queryKey: transcriptionKeys.forFile(fileId),
    });
  },

  // Cancel ongoing queries
  cancelTranscriptionQueries: () => {
    queryClient.cancelQueries({ queryKey: transcriptionKeys.all });
  },

  // Prefetch data for better UX
  prefetchTranscriptionData: async (fileId: number) => {
    await queryClient.prefetchQuery({
      queryKey: transcriptionKeys.forFile(fileId),
      queryFn: async () => {
        // Implementation depends on your API structure
        return null; // Placeholder
      },
    });
  },

  // Get query state for debugging
  getQueryState: (queryKey: string[]) => {
    return queryClient.getQueryState(queryKey);
  },

  // Clear all queries (useful for logout)
  clearAllQueries: () => {
    queryClient.clear();
  },
};

export default queryClient;
