import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import {
  handleTranscriptionError,
  handleTranscriptionSuccess,
} from "@/lib/utils/transcription-error-handler";
import { transcriptionJobManager } from "@/lib/transcription/job-manager";
import type { TranscriptionJob } from "@/lib/transcription/concurrent-manager";
import { useRobustProgressTracker } from "@/hooks/useRobustProgressTracker";
import { useProgressSyncManager } from "@/lib/progress/sync-manager";
import type { ProgressUpdate, DeviceInfo } from "@/types/mobile";
import type { DataSource } from "@/lib/progress/sync-manager";

// 转录响应类型
interface TranscriptionResponse {
  success: boolean;
  data: {
    status: string;
    text?: string;
    language: string;
    duration?: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      wordTimestamps?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
    // Enhanced job information
    job?: {
      id: string;
      is_chunked: boolean;
      total_chunks: number;
      priority: number;
      created_at: string;
      language: string;
      model: string;
    };
    processing_time?: number;
  };
}

// Enhanced transcription options
interface TranscriptionOptions {
  language?: string;
  priority?: number;
  enableChunking?: boolean;
  chunkSizeMb?: number;
  progressTracking?: boolean;
  updateIntervalMs?: number;
  deviceInfo?: {
    device_type: "desktop" | "mobile" | "tablet";
    network_type?: "wifi" | "cellular" | "unknown";
    battery_level?: number;
    is_low_power_mode?: boolean;
  };
  // Enhanced progress tracking options
  enableEnhancedProgress?: boolean;
  fallbackConfig?: {
    maxTierTransitions?: number;
    tierTransitionCooldown?: number;
    healthCheckTimeout?: number;
    enableMobileOptimizations?: boolean;
  };
  progressSyncConfig?: {
    conflictResolution?:
      | "latest"
      | "highest"
      | "lowest"
      | "weighted"
      | "priority"
      | "smart";
    enableOfflineSupport?: boolean;
    syncInterval?: number;
    throttleMs?: number;
  };
}

// 查询转录状态的查询键
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) =>
    [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "progress"] as const,
  jobs: ["jobs"] as const,
  job: (jobId: string) => [...transcriptionKeys.jobs, "id", jobId] as const,
  forFileJobs: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "jobs"] as const,
  detailedProgress: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "detailed-progress"] as const,
  performance: () => [...transcriptionKeys.all, "performance"] as const,
};

// 获取文件转录状态的查询 - 简化版本
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts
        .where("fileId")
        .equals(fileId)
        .toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (transcript && typeof transcript.id === "number") {
        const segments = await db.segments
          .where("transcriptId")
          .equals(transcript.id)
          .toArray();
        return {
          transcript,
          segments,
        };
      }

      return {
        transcript: null,
        segments: [],
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - 增加缓存时间减少网络请求
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Enhanced hook for job-based transcription status
export function useTranscriptionJob(jobId: string) {
  return useQuery({
    queryKey: transcriptionKeys.job(jobId),
    queryFn: async () => {
      const jobStatus = transcriptionJobManager.getJobStatus(jobId);
      return jobStatus;
    },
    enabled: !!jobId,
    staleTime: 2000, // 2 seconds for real-time updates
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: (data) => {
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") {
        return false; // Stop polling when job is finished
      }
      return 2000; // Poll every 2 seconds for active jobs
    },
    refetchIntervalInBackground: true,
  });
}

// Hook for getting all jobs for a file
export function useTranscriptionJobs(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFileJobs(fileId),
    queryFn: async () => {
      const jobs = transcriptionJobManager.getJobsByFile(fileId);
      return jobs;
    },
    enabled: !!fileId,
    staleTime: 5000, // 5 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for detailed progress tracking
export function useDetailedProgress(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.detailedProgress(fileId),
    queryFn: async () => {
      const jobs = transcriptionJobManager.getJobsByFile(fileId);
      const activeJobs = jobs.filter((job) =>
        [
          "queued",
          "uploading",
          "processing",
          "chunking",
          "transcribing",
          "post-processing",
        ].includes(job.status),
      );

      if (activeJobs.length === 0) {
        return {
          status: "idle",
          progress: 0,
          currentStage: "idle",
          message: "No active transcription jobs",
          jobs: [],
        };
      }

      // Calculate overall progress from all active jobs
      const totalProgress =
        activeJobs.reduce((sum, job) => sum + job.overallProgress, 0) /
        activeJobs.length;
      const primaryJob = activeJobs[0]; // Use first job as primary status

      return {
        status: primaryJob.status,
        progress: Math.round(totalProgress),
        currentStage: primaryJob.currentStage,
        message: getStageMessage(
          primaryJob.currentStage,
          primaryJob.stageProgress,
        ),
        jobs: activeJobs,
        isChunked: primaryJob.isChunked,
        totalChunks: activeJobs.reduce((sum, job) => sum + job.totalChunks, 0),
        processedChunks: activeJobs.reduce(
          (sum, job) => sum + job.processedChunks,
          0,
        ),
        estimatedCompletionTime: primaryJob.estimatedCompletionTime,
      };
    },
    enabled: !!fileId,
    staleTime: 1500, // 1.5 seconds for smooth progress updates
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: (data) => {
      if (!data || data.status === "completed" || data.status === "failed") {
        return false;
      }
      return 1500; // Poll every 1.5 seconds
    },
    refetchIntervalInBackground: true,
  });
}

// Hook for performance metrics
export function useTranscriptionPerformance(timeWindow?: string) {
  return useQuery({
    queryKey: [...transcriptionKeys.performance(), timeWindow],
    queryFn: async () => {
      const metrics = transcriptionJobManager.getPerformanceMetrics(timeWindow);
      return metrics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // Refresh every 10 minutes
  });
}

// Hook for transcription statistics
export function useTranscriptionStatistics() {
  return useQuery({
    queryKey: [...transcriptionKeys.all, "statistics"],
    queryFn: async () => {
      const stats = transcriptionJobManager.getJobStatistics();
      return stats;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

// Helper function to get stage messages
function getStageMessage(
  stage: string,
  stageProgress: TranscriptionJob["stageProgress"],
): string {
  switch (stage) {
    case "upload":
      return `Uploading audio... ${Math.round(stageProgress.upload.progress)}%`;
    case "transcription":
      return `Transcribing audio... ${Math.round(stageProgress.transcription.progress)}%`;
    case "post-processing":
      return `Processing transcription... ${Math.round(stageProgress["post-processing"].progress)}%`;
    case "completed":
      return "Transcription completed successfully";
    case "failed":
      return "Transcription failed";
    default:
      return "Processing...";
  }
}

/**
 * Device information detection utility
 */
async function detectDeviceInfo(): Promise<{
  device_type: "desktop" | "mobile" | "tablet";
  network_type?: "wifi" | "cellular" | "unknown";
  battery_level?: number;
  is_low_power_mode?: boolean;
}> {
  try {
    // Basic device detection
    const userAgent = navigator.userAgent.toLowerCase();
    let deviceType: "mobile" | "desktop" | "tablet";

    if (
      /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      )
    ) {
      deviceType = "mobile";
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
      deviceType = "tablet";
    } else {
      deviceType = "desktop";
    }

    // Network information
    let networkType: "wifi" | "cellular" | "unknown" = "unknown";
    let isLowPowerMode = false;
    let batteryLevel: number | undefined;

    try {
      // @ts-ignore - Experimental API
      if ("connection" in navigator) {
        // @ts-ignore
        const connection = navigator.connection;
        if (connection.effectiveType) {
          // @ts-ignore
          networkType = connection.effectiveType.includes("cellular")
            ? "cellular"
            : "wifi";
        }
      }

      // Battery API (if available)
      // @ts-ignore
      if ("getBattery" in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        batteryLevel = battery.level;
        isLowPowerMode = !battery.charging && batteryLevel < 0.2;
      }
    } catch (error) {
      console.warn("Could not get device network/battery info:", error);
    }

    return {
      device_type: deviceType,
      network_type: networkType,
      battery_level: batteryLevel,
      is_low_power_mode: isLowPowerMode,
    };
  } catch (error) {
    console.warn("Could not detect device info:", error);
    return {
      device_type: "desktop",
      network_type: "unknown",
    };
  }
}

/**
 * 保存转录结果到数据库
 */
async function saveTranscriptionResults(
  fileId: number,
  data: TranscriptionResponse["data"],
): Promise<void> {
  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: data.text,
    language: data.language,
    processingTime: 0, // API route doesn't provide this info
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (data.segments && data.segments.length > 0) {
    const segments = data.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      wordTimestamps: segment.wordTimestamps || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.segments.bulkAdd(segments);
  }
}

/**
 * Enhanced transcription hook with progress tracking integration
 */
export function useTranscriptionWithProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      language = "ja",
      options = {},
    }: {
      fileId: number;
      language?: string;
      options?: TranscriptionOptions;
    }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 检测设备信息（如果未提供）
      let deviceInfo = options.deviceInfo;
      if (!deviceInfo) {
        deviceInfo = await detectDeviceInfo();
      }

      // 转录开始：使用增强的服务器端 API

      // 准备增强的表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append(
        "meta",
        JSON.stringify({ fileId: file.id?.toString() || "" }),
      );

      // 添加增强的转录选项
      formData.append("language", options.language || language);
      formData.append("priority", (options.priority || 0).toString());
      formData.append(
        "enable_chunking",
        (options.enableChunking || false).toString(),
      );
      formData.append("chunk_size_mb", (options.chunkSizeMb || 15).toString());
      formData.append(
        "progress_tracking",
        (options.progressTracking !== false).toString(),
      );
      formData.append(
        "update_interval_ms",
        (options.updateIntervalMs || 2000).toString(),
      );

      // Add enhanced progress tracking options
      formData.append(
        "enhanced_progress",
        (options.enableEnhancedProgress || false).toString(),
      );
      formData.append(
        "fallback_config",
        JSON.stringify(options.fallbackConfig || {}),
      );
      formData.append(
        "sync_config",
        JSON.stringify(options.progressSyncConfig || {}),
      );

      if (deviceInfo) {
        formData.append("device_info", JSON.stringify(deviceInfo));
      }

      try {
        // 调用服务器端 API 路由
        console.log("📡 发送增强转录请求:", {
          url: `/api/transcribe?fileId=${fileId}&language=${language}`,
          method: "POST",
          formDataKeys: Array.from(formData.keys()),
          fileName: file.name,
          fileSize: file.size,
          hasEnhancedProgress: options.enableEnhancedProgress,
        });

        const response = await fetch(
          `/api/transcribe?fileId=${fileId}&language=${language}`,
          {
            method: "POST",
            body: formData,
          },
        );

        console.log("📡 API 响应状态:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ API 错误响应:", errorData);
          throw new Error(
            errorData.message ||
              `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result: TranscriptionResponse = await response.json();

        if (!result.success) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        // Handle job-based vs immediate transcription
        if (result.data.job) {
          // Job-based transcription (chunked or queued)
          console.log("增强转录任务已创建:", {
            jobId: result.data.job.id,
            isChunked: result.data.job.is_chunked,
            totalChunks: result.data.job.total_chunks,
            status: result.data.status,
            hasEnhancedProgress: options.enableEnhancedProgress,
          });

          // For job-based transcription, return job info with enhanced progress support
          return {
            ...result.data,
            jobId: result.data.job.id,
            isJobBased: true,
            hasEnhancedProgress: options.enableEnhancedProgress,
            deviceInfo,
          };
        } else if (result.data.text) {
          // Immediate transcription (small files, non-chunked)
          console.log("转录立即完成:", {
            textLength: result.data.text.length,
            segmentsCount: result.data.segments?.length || 0,
            processingTime: result.data.processing_time,
          });

          // 保存转录结果到数据库
          await saveTranscriptionResults(fileId, result.data);

          return {
            ...result.data,
            isJobBased: false,
            hasEnhancedProgress: false, // No enhanced progress needed for immediate transcription
          };
        } else {
          throw new Error("转录响应格式无效");
        }
      } catch (error) {
        handleTranscriptionError(error, {
          fileId,
          operation: "transcribe-enhanced",
          language,
        });
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      if (result.isJobBased && result.hasEnhancedProgress) {
        // Enhanced job-based transcription started
        console.log("增强转录任务已启动:", {
          fileId: variables.fileId,
          jobId: result.jobId,
          isChunked: result.isChunked,
          hasEnhancedProgress: true,
        });

        handleTranscriptionSuccess({
          fileId: variables.fileId,
          operation: "transcribe-enhanced-queued",
          language: variables.language,
        });

        // Invalidate enhanced progress tracking queries
        if (result.jobId) {
          queryClient.invalidateQueries({
            queryKey: transcriptionKeys.job(result.jobId),
          });
          // Invalidate enhanced progress queries
          queryClient.invalidateQueries({
            queryKey: ["enhancedProgress", "job", result.jobId],
          });
        }
        queryClient.invalidateQueries({
          queryKey: transcriptionKeys.forFileJobs(variables.fileId),
        });
        queryClient.invalidateQueries({
          queryKey: ["enhancedProgress", "file", variables.fileId],
        });
      } else if (result.isJobBased) {
        // Regular job-based transcription started
        console.log("转录任务已启动:", {
          fileId: variables.fileId,
          jobId: result.jobId,
          isChunked: result.isChunked,
        });

        handleTranscriptionSuccess({
          fileId: variables.fileId,
          operation: "transcribe-queued",
          language: variables.language,
        });

        // Invalidate job-related queries
        if (result.jobId) {
          queryClient.invalidateQueries({
            queryKey: transcriptionKeys.job(result.jobId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: transcriptionKeys.forFileJobs(variables.fileId),
        });
      } else {
        // Immediate transcription completed
        console.log("转录立即完成:", {
          fileId: variables.fileId,
          textLength: result.text?.length || 0,
          processingTime: result.processing_time,
        });

        handleTranscriptionSuccess({
          fileId: variables.fileId,
          operation: "transcribe",
          language: variables.language,
        });
      }

      // Always invalidate file-related queries
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.detailedProgress(variables.fileId),
      });
    },
    onError: (error, variables) => {
      handleTranscriptionError(error, {
        fileId: variables.fileId,
        operation: "transcribe-enhanced",
        language: variables.language,
      });

      // 刷新查询状态 - 合并缓存失效调用，减少网络请求
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}

/**
 * Hook for enhanced progress tracking with sync manager
 */
export function useEnhancedProgressTracking(
  jobId: string,
  fileId: number,
  options: {
    deviceInfo?: DeviceInfo;
    fallbackConfig?: any;
    syncConfig?: any;
  } = {},
) {
  const robustProgress = useRobustProgressTracker(jobId, fileId, {
    deviceInfo: options.deviceInfo,
    fallbackConfig: options.fallbackConfig,
  });

  const syncManager = useProgressSyncManager(jobId, fileId, options.syncConfig);

  // Combine robust progress with sync manager for best reliability
  const progress = robustProgress.progress || syncManager.progress;
  const isConnected =
    robustProgress.isConnected || syncManager.syncStatus === "synced";

  return {
    progress,
    isConnected,
    isLoading: robustProgress.isLoading,
    error:
      robustProgress.error ||
      (syncManager.syncStatus === "error" ? new Error("Sync error") : null),

    // Robust progress features
    currentTier: robustProgress.currentTier,
    healthMetrics: robustProgress.healthMetrics,
    fallbackHistory: robustProgress.fallbackHistory,

    // Sync manager features
    syncStatus: syncManager.syncStatus,
    conflicts: syncManager.conflicts,

    // Control functions
    start: robustProgress.start,
    stop: robustProgress.stop,
    forceFallback: robustProgress.forceFallback,
    refetch: robustProgress.refetch,
    forceConflictResolution: syncManager.forceConflictResolution,

    // Add progress data from different sources
    addProgressData: syncManager.addProgressData,
  };
}

// 转录操作的 mutation - 修复版本，使用服务器端 API 路由
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      language = "ja",
      options = {},
    }: {
      fileId: number;
      language?: string;
      options?: TranscriptionOptions;
    }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 转录开始：使用增强的服务器端 API

      // 准备增强的表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append(
        "meta",
        JSON.stringify({ fileId: file.id?.toString() || "" }),
      );

      // 添加增强的转录选项
      formData.append("language", options.language || language);
      formData.append("priority", (options.priority || 0).toString());
      formData.append(
        "enable_chunking",
        (options.enableChunking || false).toString(),
      );
      formData.append("chunk_size_mb", (options.chunkSizeMb || 15).toString());
      formData.append(
        "progress_tracking",
        (options.progressTracking !== false).toString(),
      );
      formData.append(
        "update_interval_ms",
        (options.updateIntervalMs || 2000).toString(),
      );

      if (options.deviceInfo) {
        formData.append("device_info", JSON.stringify(options.deviceInfo));
      }

      try {
        // 调用服务器端 API 路由
        console.log("📡 发送转录请求:", {
          url: `/api/transcribe?fileId=${fileId}&language=${language}`,
          method: "POST",
          formDataKeys: Array.from(formData.keys()),
          fileName: file.name,
          fileSize: file.size,
        });

        const response = await fetch(
          `/api/transcribe?fileId=${fileId}&language=${language}`,
          {
            method: "POST",
            body: formData,
          },
        );

        console.log("📡 API 响应状态:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ API 错误响应:", errorData);
          throw new Error(
            errorData.message ||
              `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result: TranscriptionResponse = await response.json();

        if (!result.success) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        // Handle job-based vs immediate transcription
        if (result.data.job) {
          // Job-based transcription (chunked or queued)
          console.log("转录任务已创建:", {
            jobId: result.data.job.id,
            isChunked: result.data.job.is_chunked,
            totalChunks: result.data.job.total_chunks,
            status: result.data.status,
          });

          // For job-based transcription, return job info
          // Results will be saved when the job completes
          return {
            ...result.data,
            jobId: result.data.job.id,
            isJobBased: true,
          };
        } else if (result.data.text) {
          // Immediate transcription (small files, non-chunked)
          console.log("转录立即完成:", {
            textLength: result.data.text.length,
            segmentsCount: result.data.segments?.length || 0,
            processingTime: result.data.processing_time,
          });

          // 保存转录结果到数据库
          await saveTranscriptionResults(fileId, result.data);

          return {
            ...result.data,
            isJobBased: false,
          };
        } else {
          throw new Error("转录响应格式无效");
        }
      } catch (error) {
        handleTranscriptionError(error, {
          fileId,
          operation: "transcribe",
          language,
        });
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      if (result.isJobBased) {
        // Job-based transcription started
        console.log("转录任务已启动:", {
          fileId: variables.fileId,
          jobId: result.jobId,
          isChunked: result.isChunked,
        });

        handleTranscriptionSuccess({
          fileId: variables.fileId,
          operation: "transcribe-queued",
          language: variables.language,
        });

        // Invalidate job-related queries
        if (result.jobId) {
          queryClient.invalidateQueries({
            queryKey: transcriptionKeys.job(result.jobId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: transcriptionKeys.forFileJobs(variables.fileId),
        });
      } else {
        // Immediate transcription completed
        console.log("转录立即完成:", {
          fileId: variables.fileId,
          textLength: result.text?.length || 0,
          processingTime: result.processing_time,
        });

        handleTranscriptionSuccess({
          fileId: variables.fileId,
          operation: "transcribe",
          language: variables.language,
        });
      }

      // Always invalidate file-related queries
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.detailedProgress(variables.fileId),
      });
    },
    onError: (error, variables) => {
      handleTranscriptionError(error, {
        fileId: variables.fileId,
        operation: "transcribe",
        language: variables.language,
      });

      // 刷新查询状态 - 合并缓存失效调用，减少网络请求
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}
