import Groq from "groq-sdk";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/utils/api-response";
import { GroqClientFactory } from "@/lib/ai/groq-client-factory";
import { transcribeWithRetry } from "@/lib/ai/groq-retry-strategy";
import { AudioChunkingStrategy } from "@/lib/audio/chunking-strategy";
import { concurrentTranscriptionManager } from "@/lib/transcription/concurrent-manager";
import { transcriptionJobManager } from "@/lib/transcription/job-manager";
import { progressTrackerManager } from "@/lib/db/progress-tracker";
import type { DeviceInfo } from "@/types/mobile";
import {
  withEnhancedErrorHandling,
  defaultMiddlewareConfig,
} from "@/lib/api/api-middleware-wrapper";
import type { EnhancedRequestContext } from "@/lib/api/api-middleware-wrapper";

// Zod schemas for validation
const transcribeQuerySchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
  chunkIndex: z.coerce.number().int().min(0).optional(),
  offsetSec: z.coerce.number().min(0).optional(),
  language: z.string().optional().default("en"),
});

// Helper function to check if object is a File-like object
function isFileLike(obj: unknown): obj is File {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "name" in obj &&
    typeof obj.name === "string" &&
    "size" in obj &&
    typeof obj.size === "number" &&
    "type" in obj &&
    typeof obj.type === "string" &&
    "arrayBuffer" in obj &&
    typeof obj.arrayBuffer === "function"
  );
}

const transcribeFormSchema = z.object({
  audio: z
    .any()
    .refine((file) => isFileLike(file), { message: "Audio file is required" }),
  meta: z
    .object({
      fileId: z.string().optional(),
      chunkIndex: z.number().int().min(0).optional(),
      offsetSec: z.number().min(0).optional(),
    })
    .optional(),
  // Enhanced transcription options
  language: z.string().default("auto"),
  priority: z.number().min(0).max(10).default(0),
  enable_chunking: z.boolean().default(false),
  chunk_size_mb: z.number().min(1).max(50).default(15),
  progress_tracking: z.boolean().default(true),
  update_interval_ms: z.number().min(1000).max(10000).default(2000),
  device_info: z
    .object({
      device_type: z.enum(["desktop", "mobile", "tablet"]),
      network_type: z.enum(["wifi", "cellular", "unknown"]).optional(),
      battery_level: z.number().min(0).max(1).optional(),
      is_low_power_mode: z.boolean().default(false),
    })
    .optional(),
  // Enhanced progress tracking options
  enhanced_progress: z.boolean().default(false),
  fallback_config: z
    .object({
      maxTierTransitions: z.number().min(1).max(10).optional(),
      tierTransitionCooldown: z.number().min(1000).max(30000).optional(),
      healthCheckTimeout: z.number().min(5000).max(60000).optional(),
      enableMobileOptimizations: z.boolean().default(true),
    })
    .optional(),
  sync_config: z
    .object({
      conflictResolution: z
        .enum(["latest", "highest", "lowest", "weighted", "priority", "smart"])
        .default("smart"),
      enableOfflineSupport: z.boolean().default(true),
      syncInterval: z.number().min(500).max(5000).default(1000),
      throttleMs: z.number().min(100).max(2000).default(200),
    })
    .optional(),
});

// Helper function to validate query parameters
function validateQueryParams(searchParams: Record<string, string>) {
  const validatedQuery = transcribeQuerySchema.safeParse(searchParams);
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
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: issues,
        statusCode: 400,
      }),
    };
  }
  return { success: true as const, data: validatedQuery.data };
}

// Helper function to validate form data
function validateFormData(formData: FormData) {
  const uploadedFile = formData.get("audio") ?? formData.get("file");

  if (!isFileLike(uploadedFile)) {
    return {
      success: false as const,
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Audio file is required",
        details: { reason: "MISSING_AUDIO" },
        statusCode: 400,
      }),
    };
  }

  let parsedMeta: unknown;
  const rawMeta = formData.get("meta");
  if (typeof rawMeta === "string" && rawMeta.trim().length > 0) {
    try {
      parsedMeta = JSON.parse(rawMeta);
    } catch (metaError) {
      return {
        success: false as const,
        error: apiError({
          code: "VALIDATION_ERROR",
          message: "Invalid metadata payload",
          details: {
            reason: "INVALID_META_JSON",
            error:
              metaError instanceof Error
                ? metaError.message
                : String(metaError),
          },
          statusCode: 400,
        }),
      };
    }
  }

  // Extract additional form fields for enhanced transcription
  const language = (formData.get("language") as string) || "auto";
  const priority = parseInt(formData.get("priority") as string) || 0;
  const enableChunking = formData.get("enable_chunking") === "true";
  const chunkSizeMb = parseInt(formData.get("chunk_size_mb") as string) || 15;
  const progressTracking = formData.get("progress_tracking") !== "false";
  const updateIntervalMs =
    parseInt(formData.get("update_interval_ms") as string) || 2000;
  const enhancedProgress = formData.get("enhanced_progress") === "true";

  let deviceInfo;
  const deviceInfoStr = formData.get("device_info") as string;
  if (deviceInfoStr) {
    try {
      deviceInfo = JSON.parse(deviceInfoStr);
    } catch (e) {
      deviceInfo = undefined;
    }
  }

  let fallbackConfig;
  const fallbackConfigStr = formData.get("fallback_config") as string;
  if (fallbackConfigStr) {
    try {
      fallbackConfig = JSON.parse(fallbackConfigStr);
    } catch (e) {
      fallbackConfig = undefined;
    }
  }

  let syncConfig;
  const syncConfigStr = formData.get("sync_config") as string;
  if (syncConfigStr) {
    try {
      syncConfig = JSON.parse(syncConfigStr);
    } catch (e) {
      syncConfig = undefined;
    }
  }

  const validatedForm = transcribeFormSchema.safeParse({
    audio: uploadedFile,
    meta: parsedMeta,
    language,
    priority,
    enable_chunking: enableChunking,
    chunk_size_mb: chunkSizeMb,
    progress_tracking: progressTracking,
    update_interval_ms: updateIntervalMs,
    device_info: deviceInfo,
    enhanced_progress: enhancedProgress,
    fallback_config: fallbackConfig,
    sync_config: syncConfig,
  });

  if (!validatedForm.success) {
    const issues = validatedForm.error.issues.reduce(
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
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Invalid form data",
        details: issues,
        statusCode: 400,
      }),
    };
  }

  return { success: true as const, data: validatedForm.data };
}

// Helper function to process transcription using enhanced Groq SDK integration
async function processTranscription(
  uploadedFile: File,
  language: string,
  options: {
    priority?: number;
    enableChunking?: boolean;
    chunkSizeMb?: number;
    progressTracking?: boolean;
    deviceInfo?: any;
    enhancedProgress?: boolean;
    fallbackConfig?: any;
    syncConfig?: any;
  } = {},
): Promise<
  | {
      success: true;
      data: {
        segments: Array<{
          start: number;
          end: number;
          text: string;
          wordTimestamps?: Array<{
            word: string;
            start: number;
            end: number;
          }>;
          confidence?: number;
          id: number;
        }>;
        text?: string;
        language?: string;
        duration?: number;
        jobId?: string;
        isChunked?: boolean;
        totalChunks?: number;
      };
    }
  | { success: false; error: NextResponse }
> {
  console.log("开始处理转录请求 (Groq SDK):", {
    fileName: uploadedFile.name,
    fileSize: uploadedFile.size,
    fileType: uploadedFile.type,
    language,
    timestamp: new Date().toISOString(),
  });

  // 检查 API 密钥
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      success: false as const,
      error: apiError({
        code: "API_KEY_MISSING",
        message: "Groq API 密钥未配置",
        details: {
          fileName: uploadedFile.name,
        },
        statusCode: 500,
      }),
    };
  }

  // 初始化增强的 Groq 客户端
  const groqClientFactory = GroqClientFactory.getInstance();
  const groq = groqClientFactory.getClient({
    apiKey: apiKey,
    timeout: parseInt(process.env.GROQ_TIMEOUT_MS || "25000"),
    maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || "2"),
  });

  // 检查是否需要分块处理
  const shouldChunk =
    options.enableChunking ||
    uploadedFile.size > options.chunkSizeMb! * 1024 * 1024;
  const startTime = Date.now();

  try {
    let transcription;
    let jobId: string | undefined;
    let isChunked = false;
    let totalChunks = 1;

    if (shouldChunk || options.enhancedProgress) {
      // 使用增强转录任务管理器
      console.log("使用增强转录策略:", {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        chunkSizeMb: options.chunkSizeMb,
        enhancedProgress: options.enhancedProgress,
        shouldChunk,
      });

      // Create job using enhanced job manager
      jobId = await transcriptionJobManager.createJob({
        fileId: 0, // Will be set after file save
        audioFile: uploadedFile,
        language: language === "auto" ? undefined : language,
        model: "whisper-large-v3-turbo",
        priority: options.priority,
        deviceType: options.deviceInfo?.device_type || "desktop",
        networkType: options.deviceInfo?.network_type || "unknown",
        enableChunking: shouldChunk,
        chunkSizeMb: options.chunkSizeMb,
        onProgress: (job) => {
          // Enhanced progress tracking updates
          if (options.enhancedProgress && options.progressTracking) {
            // Update progress tracker
            console.log("Enhanced progress update:", {
              jobId: job.id,
              stage: job.currentStage,
              progress: job.overallProgress,
            });
          }
        },
        onComplete: (job) => {
          console.log("Transcription job completed:", {
            jobId: job.id,
            duration: job.processingTime,
            isChunked: job.isChunked,
          });
        },
        onError: (job) => {
          console.error("Transcription job failed:", {
            jobId: job.id,
            error: job.errorMessage,
            errorType: job.errorType,
          });
        },
      });

      // Create enhanced progress tracker if requested
      if (options.enhancedProgress && jobId) {
        try {
          const progressTracker = progressTrackerManager.createTracker(jobId, {
            fileId: 0, // Will be set after file save
            deviceInfo: options.deviceInfo as DeviceInfo,
            fallbackConfig: options.fallbackConfig,
            syncConfig: options.syncConfig,
          });

          console.log("Enhanced progress tracker created:", {
            jobId,
            trackerId: progressTracker.id,
            deviceType: options.deviceInfo?.device_type,
          });
        } catch (error) {
          console.warn("Failed to create enhanced progress tracker:", error);
          // Continue without enhanced progress tracking
        }
      }

      isChunked = shouldChunk;
      const jobStatus = transcriptionJobManager.getJobStatus(jobId);
      totalChunks = jobStatus?.totalChunks || 1;

      console.log("增强转录任务已创建:", {
        jobId,
        isChunked,
        totalChunks,
        enhancedProgress: options.enhancedProgress,
      });

      // Return job creation response for async processing
      return {
        success: true,
        data: {
          text: undefined, // Will be available when job completes
          language: language,
          duration: undefined,
          segments: [],
          jobId,
          isChunked,
          totalChunks,
          enhancedProgress: options.enhancedProgress,
        },
      };
    } else {
      // 使用增强的重试策略进行转录
      transcription = await transcribeWithRetry(
        async () => {
          return await groq.audio.transcriptions.create({
            file: uploadedFile,
            model: "whisper-large-v3-turbo",
            temperature: 0,
            response_format: "verbose_json",
            language: language === "auto" ? undefined : language,
            timestamp_granularities: ["word", "segment"],
          });
        },
        {
          maxAttempts: parseInt(process.env.GROQ_MAX_RETRIES || "3") + 1,
          baseDelay: 1500,
          maxDelay: 10000,
        },
      );
    }

    // 使用类型断言访问可能的属性
    const transcriptionData = transcription as any;

    console.log("转录成功完成 (Groq SDK):", {
      fileName: uploadedFile.name,
      textLength: transcription.text?.length || 0,
      duration: transcriptionData.duration,
      language: transcriptionData.language,
      // 详细调试信息
      transcriptionKeys: Object.keys(transcriptionData),
    });

    // 处理 Groq SDK 返回的转录结果
    let processedSegments: Array<{
      start: number;
      end: number;
      text: string;
      wordTimestamps?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
      confidence?: number;
      id: number;
    }> = [];

    if (transcriptionData.segments && transcriptionData.segments.length > 0) {
      // 使用 Groq SDK 返回的 segments
      processedSegments = transcriptionData.segments.map(
        (segment: any, index: number) => ({
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || "",
          wordTimestamps: segment.words?.map((word: any) => ({
            word: word.word,
            start: word.start,
            end: word.end,
          })),
          confidence: segment.confidence || 0.95,
          id: index + 1,
        }),
      );
      console.log("使用 Groq SDK 返回的 segments:", processedSegments.length);
    } else if (transcriptionData.words && transcriptionData.words.length > 0) {
      // 如果没有 segments 但有 words，根据 words 生成 segments
      console.log("Groq SDK 未返回 segments，根据 words 生成");
      const wordsPerSegment = 10; // 每10个词组成一个segment
      for (
        let i = 0;
        i < transcriptionData.words.length;
        i += wordsPerSegment
      ) {
        const segmentWords = transcriptionData.words.slice(
          i,
          i + wordsPerSegment,
        );
        if (segmentWords.length > 0) {
          processedSegments.push({
            start: segmentWords[0].start,
            end: segmentWords[segmentWords.length - 1].end,
            text: segmentWords.map((w: any) => w.word).join(" "),
            wordTimestamps: segmentWords.map((word: any) => ({
              word: word.word,
              start: word.start,
              end: word.end,
            })),
            confidence: 0.95,
            id: Math.floor(i / wordsPerSegment) + 1,
          });
        }
      }
      console.log("根据 words 生成的 segments:", processedSegments.length);
    } else if (transcription.text && transcription.text.length > 0) {
      // 生成基本的segments：按句子分割
      console.log("Groq SDK 未返回详细数据，生成基本 segments");
      const sentences = transcription.text
        .split(/[。！？.!?]+/)
        .filter((s) => s.trim().length > 0);
      const avgWordsPerSecond = 2.5; // 假设平均每秒2.5个词
      const totalDuration =
        transcriptionData.duration ||
        transcription.text.length / avgWordsPerSecond;

      processedSegments = sentences.map((sentence, index) => {
        const words = sentence.trim().split(/\s+/);
        const sentenceDuration = words.length / avgWordsPerSecond;
        const startTime =
          index === 0
            ? 0
            : sentences.slice(0, index).join("").length / avgWordsPerSecond;
        const endTime = Math.min(startTime + sentenceDuration, totalDuration);

        return {
          start: startTime,
          end: endTime,
          text: sentence.trim(),
          wordTimestamps: words.map((word, wordIndex) => ({
            word: word,
            start: startTime + wordIndex * (sentenceDuration / words.length),
            end:
              startTime + (wordIndex + 1) * (sentenceDuration / words.length),
          })),
          confidence: 0.95,
          id: index + 1,
        };
      });
      console.log("生成的基本 segments:", processedSegments.length);
    }

    const transcriptionResponse = {
      text: transcription.text,
      language: transcriptionData.language || language,
      duration: transcriptionData.duration,
      segments: processedSegments,
      jobId,
      isChunked,
      totalChunks,
      processingTime: Date.now() - startTime,
    };

    return { success: true as const, data: transcriptionResponse };
  } catch (transcriptionError) {
    console.error("转录处理失败 (Groq SDK):", {
      fileName: uploadedFile.name,
      error:
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError),
      errorType:
        transcriptionError instanceof Error
          ? transcriptionError.constructor.name
          : "Unknown",
      timestamp: new Date().toISOString(),
    });

    // 处理不同类型的错误
    let errorMessage = "转录失败";
    let statusCode = 500;
    let errorCode = "TRANSCRIPTION_ERROR";

    if (transcriptionError instanceof Error) {
      if (transcriptionError.message.includes("API key")) {
        errorMessage = "API 密钥无效或已过期";
        statusCode = 401;
        errorCode = "INVALID_API_KEY";
      } else if (transcriptionError.message.includes("quota")) {
        errorMessage = "API 配额已用完";
        statusCode = 429;
        errorCode = "QUOTA_EXCEEDED";
      } else if (transcriptionError.message.includes("file too large")) {
        errorMessage = "音频文件过大";
        statusCode = 400;
        errorCode = "FILE_TOO_LARGE";
      } else if (transcriptionError.message.includes("unsupported")) {
        errorMessage = "不支持的音频格式";
        statusCode = 400;
        errorCode = "UNSUPPORTED_FORMAT";
      } else {
        errorMessage = transcriptionError.message;
      }
    }

    return {
      success: false as const,
      error: apiError({
        code: errorCode,
        message: errorMessage,
        details: {
          error:
            transcriptionError instanceof Error
              ? transcriptionError.message
              : String(transcriptionError),
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.type,
          suggestion: "请检查音频文件格式和大小，或稍后重试",
        },
        statusCode,
      }),
    };
  }
}

export const POST = withEnhancedErrorHandling(
  async function enhancedTranscribeHandler(
    request: NextRequest,
    context?: EnhancedRequestContext,
  ): Promise<NextResponse> {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const queryValidation = validateQueryParams(searchParams);
    if (!queryValidation.success) {
      throw new Error(
        `Query validation failed: ${JSON.stringify(queryValidation.error)}`,
      );
    }

    const { language } = queryValidation.data;

    // Parse and validate form data
    const formData = await request.formData();
    const formValidation = validateFormData(formData);
    if (!formValidation.success) {
      throw new Error(
        `Form validation failed: ${JSON.stringify(formValidation.error)}`,
      );
    }

    // Enhance transcription options with device context
    const enhancedOptions = {
      priority: formValidation.data.priority,
      enableChunking: formValidation.data.enable_chunking,
      chunkSizeMb: formValidation.data.chunk_size_mb,
      progressTracking: formValidation.data.progress_tracking,
      deviceInfo: {
        ...formValidation.data.device_info,
        // Add device information from middleware context
        ...context?.deviceInfo,
      },
      enhancedProgress: formValidation.data.enhanced_progress,
      fallbackConfig: formValidation.data.fallback_config,
      syncConfig: formValidation.data.sync_config,
      // Add mobile optimizations based on device context
      mobileOptimizations: {
        enabled: true,
        batteryOptimized: context?.deviceInfo?.is_low_power_mode,
        networkOptimized: context?.deviceInfo?.network_type === "cellular",
        deviceType: context?.deviceInfo?.device_type || "desktop",
      },
    };

    // Process transcription with enhanced options
    const transcriptionResult = await processTranscription(
      formValidation.data.audio,
      formValidation.data.language,
      enhancedOptions,
    );

    if (!transcriptionResult.success) {
      // Let the enhanced error handler process this error
      throw new Error(
        transcriptionResult.error.message || "Transcription failed",
      );
    }

    // Return enhanced response with job information and context
    return apiSuccess({
      status: transcriptionResult.data.jobId ? "queued" : "completed",
      text: transcriptionResult.data.text,
      language:
        transcriptionResult.data.language ?? formValidation.data.language,
      duration: transcriptionResult.data.duration,
      segments: transcriptionResult.data.segments,
      meta: formValidation.data.meta,
      // Enhanced job information
      job: transcriptionResult.data.jobId
        ? {
            id: transcriptionResult.data.jobId,
            is_chunked: transcriptionResult.data.isChunked,
            total_chunks: transcriptionResult.data.totalChunks,
            priority: formValidation.data.priority,
            created_at: new Date().toISOString(),
            language: formValidation.data.language,
            model: "whisper-large-v3-turbo",
          }
        : undefined,
      processing_time: transcriptionResult.data.processingTime,
      // Add mobile optimization information
      mobile_optimized: enhancedOptions.mobileOptimizations.enabled,
      battery_optimized: enhancedOptions.mobileOptimizations.batteryOptimized,
      network_optimized: enhancedOptions.mobileOptimizations.networkOptimized,
      // Add request context information
      request_context: {
        device_type: context?.deviceInfo?.device_type,
        request_id: context?.metadata.requestId,
        session_id: context?.metadata.sessionId,
        processing_time: Date.now() - (context?.startTime || Date.now()),
      },
    });
  },
  {
    ...defaultMiddlewareConfig,
    // Transcription-specific configuration
    enableMobileOptimizations: true,
    batteryOptimizations: true,
    networkOptimizations: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    enableTimeoutProtection: true,
    requestTimeoutMs: 120000, // 2 minutes for transcription
    enableRateLimiting: true,
    maxRequestsPerMinute: 30, // Lower limit for transcription API
    customContext: {
      customData: {
        feature: "transcription",
        service: "groq-whisper",
        model: "whisper-large-v3-turbo",
      },
    },
  },
);
