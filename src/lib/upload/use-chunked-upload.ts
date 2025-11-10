/**
 * TanStack Query integration for chunked upload system
 *
 * This module provides React hooks for integrating the chunked upload system
 * with TanStack Query for state management and caching.
 */

import { useCallback, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  UploadSession,
  UploadProgress,
  ChunkedUploaderOptions,
  UploadConfig,
  UploadError,
  PerformanceMetrics,
} from "@/types/upload";

import { ChunkedUploader } from "./chunked-uploader";
import { UploadErrorHandler } from "./error-handler";

// Singleton uploader instance
let uploaderInstance: ChunkedUploader | null = null;
let errorHandlerInstance: UploadErrorHandler | null = null;

// Query keys
export const chunkedUploadKeys = {
  all: ["chunkedUpload"] as const,
  sessions: () => [...chunkedUploadKeys.all, "sessions"] as const,
  session: (sessionId: string) => [...chunkedUploadKeys.sessions(), sessionId] as const,
  progress: (sessionId: string) => [...chunkedUploadKeys.session(sessionId), "progress"] as const,
  metrics: (sessionId: string) => [...chunkedUploadKeys.session(sessionId), "metrics"] as const,
  active: () => [...chunkedUploadKeys.all, "active"] as const,
};

/**
 * Get or create the singleton uploader instance
 */
function getUploaderInstance(options?: ChunkedUploaderOptions): ChunkedUploader {
  if (!uploaderInstance) {
    uploaderInstance = new ChunkedUploader({
      enableLogging: process.env.NODE_ENV === 'development',
      ...options,
    });
  }
  return uploaderInstance;
}

/**
 * Get or create the singleton error handler instance
 */
function getErrorHandlerInstance(): UploadErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new UploadErrorHandler();
  }
  return errorHandlerInstance;
}

/**
 * Hook for managing chunked file uploads
 */
export function useChunkedUpload(options?: ChunkedUploaderOptions) {
  const queryClient = useQueryClient();
  const uploaderRef = useRef<ChunkedUploader | null>(null);
  const errorHandlerRef = useRef<UploadErrorHandler | null>(null);

  // Initialize instances
  uploaderRef.current = useMemo(() => getUploaderInstance(options), []);
  errorHandlerRef.current = useMemo(() => getErrorHandlerInstance(), []);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      config
    }: {
      file: File;
      config?: Partial<UploadConfig>
    }) => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }

      const sessionId = await uploaderRef.current.uploadFile(file, config);
      return { sessionId, file };
    },
    onSuccess: ({ sessionId, file }) => {
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.active() });

      options?.onComplete?.(sessionId, { file });
    },
    onError: (error) => {
      options?.onError?.(error as UploadError);
    },
  });

  // Upload file
  const uploadFile = useCallback((file: File, config?: Partial<UploadConfig>) => {
    return uploadMutation.mutate({ file, config });
  }, [uploadMutation]);

  return {
    uploadFile,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    uploadedData: uploadMutation.data,
    reset: uploadMutation.reset,
    uploader: uploaderRef.current,
    errorHandler: errorHandlerRef.current,
  };
}

/**
 * Hook for managing a specific upload session
 */
export function useUploadSession(sessionId: string) {
  const queryClient = useQueryClient();
  const uploaderRef = useRef<ChunkedUploader | null>(null);
  const errorHandlerRef = useRef<UploadErrorHandler | null>(null);

  // Get instances
  uploaderRef.current = useMemo(() => getUploaderInstance(), []);
  errorHandlerRef.current = useMemo(() => getErrorHandlerInstance(), []);

  // Session query
  const sessionQuery = useQuery({
    queryKey: chunkedUploadKeys.session(sessionId),
    queryFn: () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      return uploaderRef.current.getSession(sessionId);
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: (data) => {
      // Refetch more frequently for active uploads
      return data?.status === 'uploading' ? 2000 : false; // Every 2 seconds for active uploads
    },
  });

  // Progress query
  const progressQuery = useQuery({
    queryKey: chunkedUploadKeys.progress(sessionId),
    queryFn: () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      return uploaderRef.current.getProgress(sessionId);
    },
    staleTime: 1000, // 1 second
    refetchInterval: (data) => {
      // Refetch frequently for active uploads
      return data && (data.stage === 'uploading' || data.stage === 'verifying') ? 1000 : false;
    },
  });

  // Session mutations
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      await uploaderRef.current.pauseUpload(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.progress(sessionId) });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      await uploaderRef.current.resumeUpload(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.progress(sessionId) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      await uploaderRef.current.cancelUpload(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.progress(sessionId) });
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.active() });
    },
  });

  // Session actions
  const pauseUpload = useCallback(() => {
    return pauseMutation.mutate();
  }, [pauseMutation]);

  const resumeUpload = useCallback(() => {
    return resumeMutation.mutate();
  }, [resumeMutation]);

  const cancelUpload = useCallback(() => {
    return cancelMutation.mutate();
  }, [cancelMutation]);

  // Computed state
  const isActive = sessionQuery.data?.status === 'uploading';
  const isPaused = sessionQuery.data?.status === 'paused';
  const isCompleted = sessionQuery.data?.status === 'completed';
  const isFailed = sessionQuery.data?.status === 'failed';

  return {
    // Data
    session: sessionQuery.data,
    progress: progressQuery.data,

    // Loading states
    isLoadingSession: sessionQuery.isLoading,
    isLoadingProgress: progressQuery.isLoading,

    // Error states
    sessionError: sessionQuery.error,
    progressError: progressQuery.error,

    // Computed states
    isActive,
    isPaused,
    isCompleted,
    isFailed,

    // Actions
    pauseUpload,
    resumeUpload,
    cancelUpload,

    // Mutation states
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isCancelling: cancelMutation.isPending,

    // Mutation errors
    pauseError: pauseMutation.error,
    resumeError: resumeMutation.error,
    cancelError: cancelMutation.error,

    // Refetch functions
    refetchSession: sessionQuery.refetch,
    refetchProgress: progressQuery.refetch,
  };
}

/**
 * Hook for managing multiple upload sessions
 */
export function useUploadSessions() {
  const queryClient = useQueryClient();
  const uploaderRef = useRef<ChunkedUploader | null>(null);

  // Get uploader instance
  uploaderRef.current = useMemo(() => getUploaderInstance(), []);

  // Active sessions query
  const activeSessionsQuery = useQuery({
    queryKey: chunkedUploadKeys.active(),
    queryFn: () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      return uploaderRef.current.getActiveSessions();
    },
    staleTime: 2000, // 2 seconds
    refetchInterval: 3000, // Every 3 seconds
  });

  // Batch actions
  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }

      const sessions = uploaderRef.current.getActiveSessions();
      const pausePromises = sessions
        .filter(session => session.status === 'uploading')
        .map(session => uploaderRef.current!.pauseUpload(session.id));

      await Promise.allSettled(pausePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.active() });
    },
  });

  const cancelAllMutation = useMutation({
    mutationFn: async () => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }

      const sessions = uploaderRef.current.getActiveSessions();
      const cancelPromises = sessions
        .map(session => uploaderRef.current!.cancelUpload(session.id));

      await Promise.allSettled(cancelPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunkedUploadKeys.active() });
    },
  });

  // Actions
  const pauseAll = useCallback(() => {
    return pauseAllMutation.mutate();
  }, [pauseAllMutation]);

  const cancelAll = useCallback(() => {
    return cancelAllMutation.mutate();
  }, [cancelAllMutation]);

  // Computed state
  const sessions = activeSessionsQuery.data || [];
  const uploadingSessions = sessions.filter(s => s.status === 'uploading');
  const pausedSessions = sessions.filter(s => s.status === 'paused');
  const hasActiveSessions = sessions.length > 0;

  return {
    // Data
    sessions,
    uploadingSessions,
    pausedSessions,

    // Loading states
    isLoading: activeSessionsQuery.isLoading,
    error: activeSessionsQuery.error,

    // Computed states
    hasActiveSessions,
    activeCount: uploadingSessions.length,
    pausedCount: pausedSessions.length,

    // Actions
    pauseAll,
    cancelAll,

    // Mutation states
    isPausingAll: pauseAllMutation.isPending,
    isCancellingAll: cancelAllMutation.isPending,

    // Mutation errors
    pauseAllError: pauseAllMutation.error,
    cancelAllError: cancelAllMutation.error,

    // Refetch
    refetch: activeSessionsQuery.refetch,
  };
}

/**
 * Hook for upload performance monitoring
 */
export function useUploadPerformance(sessionId: string) {
  const queryClient = useQueryClient();
  const uploaderRef = useRef<ChunkedUploader | null>(null);
  const errorHandlerRef = useRef<UploadErrorHandler | null>(null);

  // Get instances
  uploaderRef.current = useMemo(() => getUploaderInstance(), []);
  errorHandlerRef.current = useMemo(() => getErrorHandlerInstance(), []);

  // Performance metrics query
  const metricsQuery = useQuery({
    queryKey: chunkedUploadKeys.metrics(sessionId),
    queryFn: () => {
      if (!errorHandlerRef.current) {
        throw new Error("Error handler not initialized");
      }
      return errorHandlerRef.current.getErrorStatistics(sessionId);
    },
    staleTime: 10000, // 10 seconds
  });

  // Diagnostic report query
  const diagnosticQuery = useQuery({
    queryKey: [...chunkedUploadKeys.session(sessionId), "diagnostic"],
    queryFn: () => {
      if (!errorHandlerRef.current) {
        throw new Error("Error handler not initialized");
      }
      return errorHandlerRef.current.generateDiagnosticReport(sessionId);
    },
    staleTime: 30000, // 30 seconds
    enabled: !!sessionId && metricsQuery.data?.totalErrors > 0,
  });

  return {
    metrics: metricsQuery.data,
    diagnostic: diagnosticQuery.data,
    isLoadingMetrics: metricsQuery.isLoading,
    isLoadingDiagnostic: diagnosticQuery.isLoading,
    metricsError: metricsQuery.error,
    diagnosticError: diagnosticQuery.error,
    refetchMetrics: metricsQuery.refetch,
    refetchDiagnostic: diagnosticQuery.refetch,
  };
}

/**
 * Hook for upload configuration management
 */
export function useUploadConfig() {
  const queryClient = useQueryClient();

  // Default configuration
  const defaultConfig: UploadConfig = {
    chunkSize: 1024 * 1024, // 1MB
    maxConcurrentUploads: 3,
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoffMultiplier: 2,
    networkTimeout: 30000,
    enableResume: true,
    enableAdaptiveChunking: true,
    minChunkSize: 256 * 1024,
    maxChunkSize: 10 * 1024 * 1024,
    verifyChunks: true,
    compressionEnabled: false,
    endpointUrl: "/api/upload/chunk",
  };

  // Config query (could be extended to load from server)
  const configQuery = useQuery({
    queryKey: ["uploadConfig"],
    queryFn: () => defaultConfig,
    staleTime: Infinity, // Config doesn't change frequently
  });

  // Config mutation (could be extended to save to server)
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<UploadConfig>) => {
      // In a real implementation, this might save to a server
      return { ...defaultConfig, ...newConfig };
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(["uploadConfig"], updatedConfig);
    },
  });

  const updateConfig = useCallback((newConfig: Partial<UploadConfig>) => {
    return updateConfigMutation.mutateAsync(newConfig);
  }, [updateConfigMutation]);

  return {
    config: configQuery.data || defaultConfig,
    updateConfig,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    isUpdating: updateConfigMutation.isPending,
    updateError: updateConfigMutation.error,
    reset: () => queryClient.setQueryData(["uploadConfig"], defaultConfig),
  };
}

/**
 * Hook for cleanup on component unmount
 */
export function useUploadCleanup() {
  const uploaderRef = useRef<ChunkedUploader | null>(null);

  // Get uploader instance
  uploaderRef.current = useMemo(() => getUploaderInstance(), []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (uploaderRef.current) {
      // Cancel all active uploads
      const activeSessions = uploaderRef.current.getActiveSessions();
      activeSessions.forEach(session => {
        uploaderRef.current!.cancelUpload(session.id).catch(error => {
          console.warn("Error cancelling upload during cleanup:", error);
        });
      });
    }
  }, []);

  return { cleanup };
}

export default {
  useChunkedUpload,
  useUploadSession,
  useUploadSessions,
  useUploadPerformance,
  useUploadConfig,
  useUploadCleanup,
};
