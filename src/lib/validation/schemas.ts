/**
 * Enhanced validation schemas using Zod for API requests and responses
 */

import { z } from 'zod';
import type { ErrorType, DeviceType, NetworkType, UploadMethod, ProcessingStage } from '@/types/transcription';

// Common file validation
export const audioFileSchema = z.instanceof(File).refine(
  (file) => file.size > 0,
  'Audio file is required and cannot be empty'
).refine(
  (file) => file.size <= 100 * 1024 * 1024, // 100MB max
  'Audio file size exceeds maximum limit of 100MB'
).refine(
  (file) => {
    const supportedTypes = [
      'audio/mpeg', // MP3
      'audio/wav',  // WAV
      'audio/mp4',  // M4A (MP4 container with audio)
      'audio/ogg',  // OGG
      'audio/flac'  // FLAC
    ];
    return supportedTypes.includes(file.type);
  },
  'Audio file must be in MP3, WAV, M4A, OGG, or FLAC format'
);

// Device info validation
export const deviceInfoSchema = z.object({
  type: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
  networkType: z.enum(['wifi', 'cellular', 'unknown']).optional(),
  batteryLevel: z.number().min(0).max(1).optional(),
  isLowPowerMode: z.boolean().default(false)
});

// Transcription request validation
export const transcriptionRequestSchema = z.object({
  // Core request
  audio: audioFileSchema,
  language: z.string().default('auto').refine(
    (lang) => lang === 'auto' || /^[a-z]{2,3}(-[A-Z]{2})?$/.test(lang),
    'Language must be valid ISO code (e.g., "en", "zh", "ja") or "auto"'
  ),

  // Enhanced options
  priority: z.number().min(0).max(10).default(0),
  enableChunking: z.boolean().default(false),
  chunkSize: z.number().min(1 * 1024 * 1024).max(50 * 1024 * 1024).optional(), // 1MB to 50MB

  // Progress tracking
  enableProgressTracking: z.boolean().default(true),
  progressUpdateInterval: z.number().min(1000).max(10000).default(2000), // 1-10 seconds

  // Mobile-specific
  deviceInfo: deviceInfoSchema.optional()
});

// Enhanced transcription job response
export const transcriptionJobResponseSchema = z.object({
  success: z.boolean(),
  job: z.object({
    id: z.string(),
    fileId: z.number(),
    status: z.enum([
      'queued', 'uploading', 'processing', 'chunking',
      'transcribing', 'post-processing', 'completed', 'failed', 'cancelled'
    ]),
    priority: z.number().min(0).max(10),
    createdAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    isChunked: z.boolean(),
    totalChunks: z.number().min(1),
    processedChunks: z.number().min(0),
    chunkSize: z.number().min(0),
    overlapDuration: z.number().min(0),
    currentStage: z.enum([
      'upload', 'transcription', 'post-processing', 'completed', 'failed'
    ]),
    overallProgress: z.number().min(0).max(100),
    errorType: z.enum([
      'network', 'api_key', 'rate_limit', 'quota_exceeded',
      'file_too_large', 'unsupported_format', 'timeout', 'server_error', 'unknown'
    ]).optional(),
    errorMessage: z.string().optional(),
    retryCount: z.number().min(0),
    maxRetries: z.number().min(0),
    lastRetryAt: z.string().datetime().optional(),
    language: z.string(),
    model: z.string(),
    temperature: z.number().min(0).max(1),
    responseFormat: z.enum(['json', 'verbose_json', 'text', 'srt', 'vtt']),
    timestampGranularities: z.array(z.enum(['word', 'segment'])),
    deviceType: z.enum(['desktop', 'mobile', 'tablet']),
    networkType: z.enum(['wifi', 'cellular', 'unknown']),
    uploadMethod: z.enum(['direct', 'chunked'])
  }),
  message: z.string()
});

// Progress tracking response
export const progressResponseSchema = z.object({
  jobId: z.string(),
  fileId: z.number(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  overallProgress: z.number().min(0).max(100),
  currentStage: z.string(),
  message: z.string(),

  // Detailed stage progress
  stages: z.object({
    upload: z.object({
      progress: z.number().min(0).max(100),
      speed: z.number().min(0),
      eta: z.number().optional(),
      bytesTransferred: z.number().min(0),
      totalBytes: z.number().min(0)
    }),
    transcription: z.object({
      progress: z.number().min(0).max(100),
      currentChunk: z.number().min(0),
      totalChunks: z.number().min(1),
      eta: z.number().optional()
    }),
    'post-processing': z.object({
      progress: z.number().min(0).max(100),
      segmentsProcessed: z.number().min(0),
      totalSegments: z.number().min(0)
    })
  }),

  // Performance metrics
  processingTime: z.number().min(0),
  queueTime: z.number().min(0),

  // Error information
  error: z.object({
    type: z.string(),
    message: z.string(),
    suggestedAction: z.string()
  }).optional(),

  // Mobile-specific
  mobileOptimizations: z.object({
    connectionType: z.string(),
    batteryLevel: z.number().min(0).max(1),
    isLowPowerMode: z.boolean()
  }).optional()
});

// Error response schema
export const errorResponseSchema = z.object({
  success: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  })
});

// Mobile interaction tracking schema
export const mobileInteractionRequestSchema = z.object({
  jobId: z.number().optional(),
  sessionId: z.string(),
  interactionType: z.enum(['tap', 'double_tap', 'swipe', 'drag', 'pinch', 'long_press']),
  targetElement: z.enum([
    'play_button', 'progress_bar', 'volume_control',
    'speed_control', 'upload_area', 'file_item'
  ]),
  gestureData: z.object({
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    duration: z.number().min(0),
    velocity: z.number(),
    direction: z.enum(['up', 'down', 'left', 'right'])
  }).optional(),
  deviceInfo: z.object({
    type: z.enum(['mobile', 'tablet']),
    screenSize: z.object({
      width: z.number().min(0),
      height: z.number().min(0)
    }),
    userAgent: z.string(),
    touchPoints: z.number().min(0)
  }),
  responseTime: z.number().min(0),
  successfulInteraction: z.boolean(),
  errorType: z.enum([
    'touch_not_recognized', 'target_missed', 'response_timeout', 'system_error'
  ]).optional(),
  errorMessage: z.string().optional()
});

// Performance metrics schema
export const performanceMetricsRequestSchema = z.object({
  timeWindow: z.enum(['1h', '6h', '24h', '7d']).default('24h'),
  jobId: z.string().optional()
});

// Chunked transcription request schema
export const chunkedTranscriptionRequestSchema = z.object({
  audio: audioFileSchema,
  jobId: z.string(),
  chunkIndex: z.number().min(0),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  overlapDuration: z.number().min(0).default(5),
  language: z.string().default('auto')
});

// Validation result type
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: z.ZodIssue[];
};

/**
 * Validate request data against schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.issues
    };
  }
}

/**
 * Create validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>
) {
  return (data: unknown): T => {
    const result = validateRequest(schema, data);

    if (!result.success) {
      const errorMessages = result.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }

    return result.data;
  };
}

/**
 * Enhanced validation with custom error messages
 */
export class ValidationError extends Error {
  public readonly errors: z.ZodIssue[];

  constructor(errors: z.ZodIssue[]) {
    const errorMessages = errors.map(err => `${err.path.join('.')}: ${err.message}`);
    super(`Validation failed: ${errorMessages.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Get first error message
   */
  getFirstError(): string {
    return this.errors[0]?.message || 'Unknown validation error';
  }

  /**
   * Get all error messages
   */
  getAllErrors(): string[] {
    return this.errors.map(err => err.message);
  }

  /**
   * Get errors for specific field
   */
  getFieldErrors(field: string): string[] {
    return this.errors
      .filter(err => err.path.includes(field))
      .map(err => err.message);
  }
}

// Pre-built validation functions for common requests
export const validateTranscriptionRequest = createValidationMiddleware(transcriptionRequestSchema);
export const validateProgressRequest = createValidationMiddleware(z.object({
  jobId: z.string()
}));
export const validateMobileInteractionRequest = createValidationMiddleware(mobileInteractionRequestSchema);

// Export schemas for external use
export {
  transcriptionRequestSchema,
  transcriptionJobResponseSchema,
  progressResponseSchema,
  errorResponseSchema,
  mobileInteractionRequestSchema,
  performanceMetricsRequestSchema,
  chunkedTranscriptionRequestSchema,
  audioFileSchema,
  deviceInfoSchema
};
