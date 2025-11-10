/**
 * Enhanced validation schemas with Zod for API requests
 */

import { z } from 'zod';
import type { ErrorType } from '@/types/transcription';

// File validation schema
export const fileSchema = z.instanceof(File, {
  message: 'Audio file is required'
}).refine(
  (file) => file.size > 0,
  { message: 'Audio file cannot be empty' }
).refine(
  (file) => file.size <= 200 * 1024 * 1024, // 200MB max
  { message: 'Audio file size must be less than 200MB' }
).refine(
  (file) => {
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/x-wav'];
    return validTypes.some(type => file.type === type || file.name.toLowerCase().endsWith(type.replace('audio/', '.')));
  },
  { message: 'File must be a valid audio format (MP3, WAV, M4A, OGG, FLAC)' }
);

// Language validation schema
export const languageSchema = z.string()
  .min(2, 'Language code must be at least 2 characters')
  .max(10, 'Language code must be at most 10 characters')
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Language code must be valid (e.g., "en", "zh", "ja", "en-US") or "auto"')
  .default('auto');

// Priority validation schema
export const prioritySchema = z.number()
  .int('Priority must be an integer')
  .min(0, 'Priority must be between 0 and 10')
  .max(10, 'Priority must be between 0 and 10')
  .default(0);

// Chunking configuration schema
export const chunkingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  chunkSizeMB: z.number()
    .int('Chunk size must be an integer in MB')
    .min(1, 'Chunk size must be at least 1MB')
    .max(50, 'Chunk size must be at most 50MB')
    .optional(),
  maxChunkDurationSec: z.number()
    .int('Maximum chunk duration must be an integer in seconds')
    .min(30, 'Maximum chunk duration must be at least 30 seconds')
    .max(600, 'Maximum chunk duration must be at most 10 minutes')
    .default(300),
  minChunkDurationSec: z.number()
    .int('Minimum chunk duration must be an integer in seconds')
    .min(5, 'Minimum chunk duration must be at least 5 seconds')
    .max(60, 'Minimum chunk duration must be at most 60 seconds')
    .default(30),
  overlapDurationSec: z.number()
    .int('Overlap duration must be an integer in seconds')
    .min(0, 'Overlap duration cannot be negative')
    .max(30, 'Overlap duration must be at most 30 seconds')
    .default(5)
});

// Progress tracking configuration schema
export const progressConfigSchema = z.object({
  enabled: z.boolean().default(true),
  updateIntervalMs: z.number()
    .int('Update interval must be an integer in milliseconds')
    .min(1000, 'Update interval must be at least 1 second')
    .max(10000, 'Update interval must be at most 10 seconds')
    .default(2000),
  connectionType: z.enum(['sse', 'polling', 'periodic']).default('sse'),
  fallbackToPolling: z.boolean().default(true)
});

// Device info schema for mobile optimization
export const deviceInfoSchema = z.object({
  deviceType: z.enum(['desktop', 'mobile', 'tablet']),
  networkType: z.enum(['wifi', 'cellular', 'unknown']).optional(),
  batteryLevel: z.number()
    .min(0, 'Battery level must be between 0 and 1')
    .max(1, 'Beta ttery level must be between 0 and 1')
    .optional(),
  isLowPowerMode: z.boolean().default(false)
});

// Enhanced transcription request schema
export const transcriptionRequestSchema = z.object({
  audio: fileSchema,
  language: languageSchema,
  priority: prioritySchema,
  enableChunking: z.boolean().default(false),
  chunkingConfig: chunkingConfigSchema.optional(),
  progressConfig: progressConfigSchema.optional(),
  deviceInfo: deviceInfoSchema.optional(),
  options: z.object({
    temperature: z.number().min(0).max(1).default(0),
    responseFormat: z.enum(['json', 'verbose_json', 'text', 'srt', 'vtt']).default('verbose_json'),
    timestampGranularities: z.array(z.enum(['word', 'segment'])).default(['word', 'segment']),
    prompt: z.string().optional()
  }).optional()
});

// Error classification schema
export const errorClassificationSchema = z.object({
  type: z.enum([
    'network', 'api_key', 'rate_limit', 'quota_exceeded',
    'file_too_large', 'unsupported_format', 'timeout',
    'server_error', 'unknown'
  ]),
  message: z.string().min(1, 'Error message is required'),
  code: z.string().optional(),
  statusCode: z.number().int().optional(),
  details: z.record(z.any()).optional(),
  retryable: z.boolean().optional(),
  suggestedAction: z.string().optional()
});

// Transcription job status schema
export const transcriptionJobSchema = z.object({
  id: z.string().uuid(),
  fileId: z.number().int().positive(),
  userId: z.string().uuid().optional(),
  status: z.enum([
    'queued', 'uploading', 'processing', 'chunking',
    'transcribing', 'post-processing', 'completed',
    'failed', 'cancelled'
  ]),
  priority: prioritySchema,
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  isChunked: z.boolean(),
  totalChunks: z.number().int().min(1),
  processedChunks: z.number().int().min(0),
  chunkSize: z.number().int().positive(),
  overlapDuration: z.number().int().min(0),
  currentStage: z.enum([
    'upload', 'transcription', 'post-processing', 'completed', 'failed'
  ]),
  overallProgress: z.number().min(0).max(100),
  stageProgress: z.object({
    upload: z.object({
      completed: z.boolean(),
      progress: z.number().min(0).max(100),
      duration: z.number().optional(),
      bytesUploaded: z.number().min(0),
      totalBytes: z.number().min(0)
    }),
    transcription: z.object({
      completed: z.boolean(),
      progress: z.number().min(0).max(100),
      eta: z.number().optional(),
      wordsProcessed: z.number().int().min(0),
      totalWords: z.number().int().optional()
    }),
    'post-processing': z.object({
      completed: z.boolean(),
      progress: z.number().min(0).max(100),
      segmentsProcessed: z.number().int().min(0),
      totalSegments: z.number().int().min(0)
    })
  }),
  queueTime: z.number().min(0),
  processingTime: z.number().min(0),
  uploadSpeed: z.number().min(0),
  transcriptionSpeed: z.number().min(0),
  errorType: z.enum([
    'network', 'api_key', 'rate_limit', 'quota_exceeded',
    'file_too_large', 'unsupported_format', 'timeout',
    'server_error', 'unknown'
  ]).optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  lastRetryAt: z.date().optional(),
  language: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  responseFormat: z.enum(['json', 'verbose_json', 'text', 'srt', 'vtt']),
  timestampGranularities: z.array(z.enum(['word', 'segment'])),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']),
  networkType: z.enum(['wifi', 'cellular', 'unknown']),
  uploadMethod: z.enum(['direct', 'chunked'])
});

// Progress update schema
export const progressUpdateSchema = z.object({
  jobId: z.string().uuid(),
  fileId: z.number().int().positive(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  overallProgress: z.number().min(0).max(100),
  currentStage: z.string(),
  message: z.string(),
  timestamp: z.number(),
  stages: z.object({
    upload: z.object({
      progress: z.number().min(0).max(100),
      speed: z.number().min(0),
      eta: z.number().optional(),
      bytesTransferred: z.number().min(0),
      totalBytes: z.number().min(0)
    }).optional(),
    transcription: z.object({
      progress: z.number().min(0).max(100),
      currentChunk: z.number().int().min(0),
      totalChunks: z.number().int().min(1),
      eta: z.number().optional()
    }).optional(),
    'post-processing': z.object({
      progress: z.number().min(0).max(100),
      segmentsProcessed: z.number().int().min(0),
      totalSegments: z.number().int().min(1)
    }).optional()
  }).optional(),
  processingTime: z.number().min(0).optional(),
  queueTime: z.number().min(0).optional(),
  error: z.object({
    type: z.string(),
    message: z.string(),
    suggestedAction: z.string()
  }).optional(),
  mobileOptimizations: z.object({
    connectionType: z.string(),
    batteryLevel: z.number().min(0).max(1),
    isLowPowerMode: z.boolean()
  }).optional()
});

// Mobile interaction schema
export const mobileInteractionSchema = z.object({
  id: z.string().uuid(),
  jobId: z.number().int().positive().optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string(),
  interactionType: z.enum([
    'tap', 'double_tap', 'swipe', 'drag', 'pinch', 'long_press'
  ]),
  targetElement: z.enum([
    'play_button', 'progress_bar', 'volume_control',
    'speed_control', 'upload_area', 'file_item'
  ]),
  timestamp: z.date(),
  gestureData: z.object({
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    duration: z.number().min(0),
    velocity: z.number(),
    direction: z.enum(['up', 'down', 'left', 'right']),
    distance: z.number()
  }).optional(),
  deviceInfo: z.object({
    type: z.enum(['mobile', 'tablet']),
    screenSize: z.object({
      width: z.number().min(0),
      height: z.number().min(0)
    }),
    userAgent: z.string(),
    touchPoints: z.number().int().min(0),
    orientation: z.enum(['portrait', 'landscape']).optional()
  }),
  responseTime: z.number().min(0),
  successfulInteraction: z.boolean(),
  errorType: z.enum([
    'touch_not_recognized', 'target_missed', 'response_timeout', 'system_error'
  ]).optional(),
  errorMessage: z.string().optional()
});

// Performance metrics schema
export const performanceMetricsSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  timestamp: z.date(),
  transcriptionMetrics: z.object({
    audioSize: z.number().min(0),
    audioDuration: z.number().min(0),
    processingTime: z.number().min(0),
    queueTime: z.number().min(0),
    tokensProcessed: z.number().int().min(0),
    cost: z.number().min(0),
    model: z.string(),
    success: z.boolean(),
    errorType: z.string().optional()
  }),
  progressMetrics: z.object({
    connectionType: z.enum(['sse', 'polling', 'periodic']),
    updateFrequency: z.number().min(0),
    missedUpdates: z.number().int().min(0),
    connectionDrops: z.number().int().min(0),
    reconnectionTime: z.number().min(0)
  }),
  mobileMetrics: z.object({
    deviceType: z.enum(['mobile', 'tablet', 'desktop']),
    networkType: z.enum(['wifi', 'cellular', 'unknown']),
    batteryLevel: z.number().min(0).max(1),
    isLowPowerMode: z.boolean(),
    memoryUsage: z.number().min(0),
    touchResponseTime: z.number().min(0)
  }).optional(),
  uiMetrics: z.object({
    firstContentfulPaint: z.number().min(0),
    largestContentfulPaint: z.number().min(0),
    firstInputDelay: z.number().min(0),
    cumulativeLayoutShift: z.number().min(0),
    interactionToNextPaint: z.number().min(0)
  })
});

// Environment variable validation schema
export const environmentSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Enhanced configuration
  GROQ_BASE_URL: z.string().url().optional(),
  GROQ_TIMEOUT_MS: z.coerce.number().min(1000).max(30000).optional(),
  GROQ_MAX_RETRIES: z.coerce.number().int().min(1).max(5).optional(),

  // Chunking configuration
  GROQ_CHUNK_SIZE_THRESHOLD_MB: z.coerce.number().int().min(5).max(50).optional(),
  GROQ_MAX_CHUNK_DURATION_SEC: z.coerce.number().int().min(30).max(600).optional(),
  GROQ_MIN_CHUNK_DURATION_SEC: z.coerce.number().int().min(5).max(60).optional(),
  GROQ_OVERLAP_DURATION_SEC: z.coerce.number().int().min(0).max(30).optional(),

  // Performance monitoring
  GROQ_PERFORMANCE_MONITORING: z.enum(['true', 'false']).optional(),
  GROQ_METRICS_RETENTION_HOURS: z.coerce.number().int().min(1).max(168).optional(),

  // Progress tracking
  PROGRESS_UPDATE_INTERVAL_MS: z.coerce.number().int().min(1000).max(10000).optional(),
  PROGRESS_CONNECTION_TYPE: z.enum(['sse', 'polling', 'periodic']).optional(),
  PROGRESS_FALLBACK_TO_POLLING: z.enum(['true', 'false']).optional(),

  // Mobile optimization
  MOBILE_TOUCH_TARGET_MIN_SIZE: z.coerce.number().int().min(44).max(56).optional(),
  MOBILE_TOUCH_TARGET_OPTIMAL_SIZE: z.coerce.number().int().min(48).max(64).optional(),
  MOBILE_MIN_SCREEN_WIDTH: z.coerce.number().int().min(320).max(768).optional(),

  // Performance targets
  TRANSCRIPTION_SPEED_IMPROVEMENT_TARGET: z.coerce.number().min(0).max(1).optional(),
  UI_RESPONSE_TIME_TARGET_MS: z.coerce.number().int().min(100).max(1000).optional(),
  PROGRESS_UPDATE_FREQUENCY_MS: z.coerce.number().int().min(1000).max(5000).optional(),

  // Memory management
  AUDIO_MEMORY_CACHE_SIZE_MB: z.coerce.number().int().min(50).max(500).optional(),
  AUDIO_MEMORY_CLEANUP_INTERVAL_MIN: z.coerce.number().int().min(1).max(30).optional(),

  // Legacy configuration
  TRANSCRIPTION_TIMEOUT_MS: z.coerce.number().min(30000).max(300000).optional(),
  TRANSCRIPTION_RETRY_COUNT: z.coerce.number().int().min(1).max(5).optional(),
  TRANSCRIPTION_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(5).optional()
});

// Validation error class
export class ValidationError extends Error {
  public readonly field: string;
  public readonly issues: string[];

  constructor(message: string, field: string, issues: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.issues = issues;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      issues: this.issues
    };
  }
}

// Validation helper functions
export class ValidationHelper {
  /**
   * Validate transcription request
   */
  static validateTranscriptionRequest(data: unknown): {
    success: boolean;
    data?: typeof transcriptionRequestSchema._type;
    error?: ValidationError;
  } {
    const result = transcriptionRequestSchema.safeParse(data);

    if (!result.success) {
      const error = new ValidationError(
        'Invalid transcription request',
        'request',
        result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      );
      return { success: false, error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Validate progress update
   */
  static validateProgressUpdate(data: unknown): {
    success: boolean;
    data?: typeof progressUpdateSchema._type;
    error?: ValidationError;
  } {
    const result = progressUpdateSchema.safeParse(data);

    if (!result.success) {
      const error = new ValidationError(
        'Invalid progress update',
        'progressUpdate',
        result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      );
      return { success: false, error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Validate environment variables
   */
  static validateEnvironment(): {
    success: boolean;
    data?: typeof environmentSchema._type;
    error?: ValidationError;
  } {
    try {
      // Load environment variables
      const env = {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        GROQ_BASE_URL: process.env.GROQ_BASE_URL,
        GROQ_TIMEOUT_MS: process.env.GROQ_TIMEOUT_MS,
        GROQ_MAX_RETRIES: process.env.GROQ_MAX_RETRIES,
        GROQ_CHUNK_SIZE_THRESHOLD_MB: process.env.GROQ_CHUNK_SIZE_THRESHOLD_MB,
        GROQ_MAX_CHUNK_DURATION_SEC: process.env.GROQ_MAX_CHUNK_DURATION_SEC,
        GROQ_MIN_CHUNK_DURATION_SEC: process.env.GROQ_MIN_CHUNK_DURATION_SEC,
        GROQ_OVERLAP_DURATION_SEC: process.env.GROQ_OVERLAP_DURATION_SEC,
        GROQ_PERFORMANCE_MONITORING: process.env.GROQ_PERFORMANCE_MONITORING,
        GROQ_METRICS_RETENTION_HOURS: process.env.GROQ_METRICS_RETENTION_HOURS,
        PROGRESS_UPDATE_INTERVAL_MS: process.env.PROGRESS_UPDATE_INTERVAL_MS,
        PROGRESS_CONNECTION_TYPE: process.env.PROGRESS_CONNECTION_TYPE,
        PROGRESS_FALLBACK_TO_POLLING: process.env.PROGRESS_FALLBACK_TO_POLLING,
        MOBILE_TOUCH_TARGET_MIN_SIZE: process.env.MOBILE_TOUCH_TARGET_MIN_SIZE,
        MOBILE_TOUCH_TARGET_OPTIMAL_SIZE: process.env.MOBILE_TOUCH_TARGET_OPTIMAL_SIZE,
        MOBILE_MIN_SCREEN_WIDTH: process.env.MOBILE_MIN_SCREEN_WIDTH,
        TRANSCRIPTION_SPEED_IMPROVEMENT_TARGET: process.env.TRANSCRIPTION_SPEED_IMPROVEMENT_TARGET,
        UI_RESPONSE_TIME_TARGET_MS: process.env.UI_RESPONSE_TIME_TARGET_MS,
        PROGRESS_UPDATE_FREQUENCY_MS: process.env.PROGRESS_UPDATE_FREQUENCY_MS,
        AUDIO_MEMORY_CACHE_SIZE_MB: process.env.AUDIO_MEMORY_CACHE_SIZE_MB,
        AUDIO_MEMORY_CLEANUP_INTERVAL_MIN: process.env.AUDIO_MEMORY_CLEANUP_INTERVAL_MIN,
        TRANSCRIPTION_TIMEOUT_MS: process.env.TRANSCRIPTION_TIMEOUT_MS,
        TRANSCRIPTION_RETRY_COUNT: process.env.TRANSCRIPTION_RETRY_COUNT,
        TRANSCRIPTION_MAX_CONCURRENCY: process.env.TRANSCRIPTION_MAX_CONCURRENCY
      };

      const result = environmentSchema.safeParse(env);

      if (!result.success) {
        const error = new ValidationError(
          'Invalid environment configuration',
          'environment',
          result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        );
        return { success: false, error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      const validationError = new ValidationError(
        'Failed to validate environment',
        'environment',
        ['Failed to process environment variables']
      );
      return { success: false, error: validationError };
    }
  }

  /**
   * Create file validation middleware
   */
  static createFileValidator(maxSizeMB: number = 200) {
    return z.instanceof(File, {
      message: 'Audio file is required'
    }).refine(
      (file) => file.size > 0,
      { message: 'Audio file cannot be empty' }
    ).refine(
      (file) => file.size <= maxSizeMB * 1024 * 1024,
      { message: `Audio file size must be less than ${maxSizeMB}MB` }
    ).refine(
      (file) => {
        const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/flac'];
        return validTypes.some(type => file.type === type || file.name.toLowerCase().endsWith(type.replace('audio/', '.')));
      },
      { message: 'File must be a valid audio format (MP3, WAV, M4A, OGG, FLAC)' }
    );
  }

  /**
   * Create file size validator for specific scenarios
   */
  static createFileSizeValidator(maxSizeBytes: number) {
    return z.instanceof(File, {
      message: 'File is required'
    }).refine(
      (file) => file.size <= maxSizeBytes,
      { message: `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB` }
    );
  }

  /**
   * Create language validator
   */
  static createLanguageValidator(allowedLanguages: string[] = ['en', 'zh', 'ja', 'es', 'fr', 'de']) {
    return z.string()
      .min(2, 'Language code must be at least 2 characters')
      .max(10, 'Language code must be at most 10 characters')
      .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Language code must be valid')
      .refine(
        (lang) => allowedLanguages.includes(lang) || lang === 'auto',
        { message: `Language must be one of: ${allowedLanguages.join(', ')} or 'auto'` }
      );
  }
}

// Export schemas for easy use
export {
  fileSchema,
  languageSchema,
  prioritySchema,
  chunkingConfigSchema,
  progressConfigSchema,
  deviceInfoSchema,
  transcriptionRequestSchema,
  errorClassificationSchema,
  transcriptionJobSchema,
  progressUpdateSchema,
  mobileInteractionSchema,
  performanceMetricsSchema,
  environmentSchema
};
