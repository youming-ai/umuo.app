/**
 * Enhanced transcription types for optimization features
 */

export type JobStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "chunking"
  | "transcribing"
  | "post-processing"
  | "completed"
  | "failed"
  | "cancelled";
export type ProcessingStage =
  | "upload"
  | "transcription"
  | "post-processing"
  | "completed"
  | "failed";
export type ErrorType =
  | "network"
  | "api_key"
  | "rate_limit"
  | "quota_exceeded"
  | "file_too_large"
  | "unsupported_format"
  | "timeout"
  | "server_error"
  | "unknown";
export type DeviceType = "desktop" | "mobile" | "tablet";
export type NetworkType = "wifi" | "cellular" | "unknown";
export type UploadMethod = "direct" | "chunked";
export type ConnectionType = "sse" | "polling" | "periodic";
export type ConnectionHealth = "healthy" | "degraded" | "disconnected";

export interface TranscriptionJob {
  id: string;
  fileId: number;
  userId?: string;

  // Job metadata
  status: JobStatus;
  priority: number; // 0-10, higher = higher priority
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Chunking information
  isChunked: boolean;
  totalChunks: number;
  processedChunks: number;
  chunkSize: number; // bytes
  overlapDuration: number; // seconds

  // Progress tracking
  currentStage: ProcessingStage;
  stageProgress: {
    upload: {
      completed: boolean;
      progress: number;
      duration?: number;
      bytesUploaded: number;
      totalBytes: number;
    };
    transcription: {
      completed: boolean;
      progress: number;
      eta?: number;
      wordsProcessed: number;
      totalWords?: number;
    };
    "post-processing": {
      completed: boolean;
      progress: number;
      segmentsProcessed: number;
      totalSegments: number;
    };
  };
  overallProgress: number; // 0-100

  // Performance metrics
  queueTime: number; // milliseconds from creation to start
  processingTime: number; // milliseconds total processing
  uploadSpeed: number; // bytes per second
  transcriptionSpeed: number; // audio seconds per processing second

  // Error handling
  errorType?: ErrorType;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;

  // Configuration
  language: string;
  model: string; // e.g., "whisper-large-v3-turbo"
  temperature: number;
  responseFormat: "json" | "verbose_json" | "text" | "srt" | "vtt";
  timestampGranularities: ("word" | "segment")[];

  // Mobile-specific
  deviceType: DeviceType;
  networkType: NetworkType;
  uploadMethod: UploadMethod;
}

export interface AudioChunk {
  id: string;
  jobId: string;
  chunkIndex: number;

  // Audio data
  startTime: number; // seconds from start of original audio
  endTime: number; // seconds from start of original audio
  duration: number; // seconds
  size: number; // bytes
  format: string; // e.g., "audio/mp3", "audio/wav"

  // Processing status
  status:
    | "pending"
    | "uploading"
    | "uploaded"
    | "transcribing"
    | "completed"
    | "failed";
  uploadedAt?: Date;
  transcribedAt?: Date;

  // Transcription result
  transcriptionId?: string; // Links to segment in segments table
  text?: string;
  confidence?: number;

  // Performance metrics
  uploadTime: number; // milliseconds
  transcriptionTime: number; // milliseconds

  // Error handling
  errorType?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface ProgressTracker {
  id: string;
  jobId: string;
  fileId: number;

  // Progress state
  currentStage: ProcessingStage;
  overallProgress: number; // 0-100

  // Detailed stage information
  stages: {
    upload: {
      progress: number; // 0-100
      bytesTransferred: number;
      totalBytes: number;
      speed: number; // bytes per second
      eta?: number; // seconds remaining
      startTime?: Date;
      lastUpdate: Date;
    };
    transcription: {
      progress: number; // 0-100
      currentChunk: number;
      totalChunks: number;
      averageChunkTime: number; // milliseconds
      eta?: number; // seconds remaining
      startTime?: Date;
      lastUpdate: Date;
    };
    "post-processing": {
      progress: number; // 0-100
      segmentsProcessed: number;
      totalSegments: number;
      currentOperation:
        | "normalization"
        | "translation"
        | "annotation"
        | "furigana";
      startTime?: Date;
      lastUpdate: Date;
    };
  };

  // Messages and feedback
  currentMessage: string;
  lastMessageUpdate: Date;

  // Connection management
  connectionType: ConnectionType;
  lastActivity: Date;
  connectionHealth: ConnectionHealth;

  // Mobile-specific
  deviceInfo?: {
    type: DeviceType;
    networkType: NetworkType;
    batteryLevel?: number; // 0-1
    isLowPowerMode: boolean;
  };
}

export interface MobileInteraction {
  id: string;
  jobId?: number;
  userId?: string;
  sessionId: string;

  // Interaction details
  interactionType:
    | "tap"
    | "double_tap"
    | "swipe"
    | "drag"
    | "pinch"
    | "long_press";
  targetElement:
    | "play_button"
    | "progress_bar"
    | "volume_control"
    | "speed_control"
    | "upload_area"
    | "file_item";
  timestamp: Date;

  // Touch gesture data
  gestureData?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration: number; // milliseconds
    velocity: number;
    direction: "up" | "down" | "left" | "right";
  };

  // Device context
  deviceInfo: {
    type: "mobile" | "tablet";
    screenSize: { width: number; height: number };
    userAgent: string;
    touchPoints: number;
  };

  // Performance metrics
  responseTime: number; // milliseconds from interaction to UI response
  successfulInteraction: boolean;

  // Error tracking
  errorType?:
    | "touch_not_recognized"
    | "target_missed"
    | "response_timeout"
    | "system_error";
  errorMessage?: string;
}

export interface PerformanceMetrics {
  id: string;
  jobId: string;
  timestamp: Date;

  // Transcription performance
  transcriptionMetrics: {
    audioSize: number; // bytes
    audioDuration: number; // seconds
    processingTime: number; // milliseconds
    queueTime: number; // milliseconds
    tokensProcessed: number;
    cost: number; // USD
    model: string;
    success: boolean;
    errorType?: string;
  };

  // Progress tracking performance
  progressMetrics: {
    connectionType: ConnectionType;
    updateFrequency: number; // milliseconds between updates
    missedUpdates: number;
    connectionDrops: number;
    reconnectionTime: number; // milliseconds
  };

  // Mobile performance
  mobileMetrics?: {
    deviceType: DeviceType;
    networkType: NetworkType;
    batteryLevel: number;
    isLowPowerMode: boolean;
    memoryUsage: number; // MB
    touchResponseTime: number; // milliseconds
  };

  // UI performance
  uiMetrics: {
    firstContentfulPaint: number; // milliseconds
    largestContentfulPaint: number; // milliseconds
    firstInputDelay: number; // milliseconds
    cumulativeLayoutShift: number;
    interactionToNextPaint: number; // milliseconds
  };
}

// Progress response types
export interface ProgressResponse {
  jobId: string;
  fileId: number;
  status: JobStatus;
  overallProgress: number;
  currentStage: ProcessingStage;
  message: string;

  // Detailed stage progress
  stages: {
    upload: {
      progress: number;
      speed: number;
      eta?: number;
      bytesTransferred: number;
      totalBytes: number;
    };
    transcription: {
      progress: number;
      currentChunk: number;
      totalChunks: number;
      eta?: number;
    };
    "post-processing": {
      progress: number;
      segmentsProcessed: number;
      totalSegments: number;
    };
  };

  // Performance metrics
  processingTime: number;
  queueTime: number;

  // Error information
  error?: {
    type: string;
    message: string;
    suggestedAction: string;
  };

  // Mobile-specific
  mobileOptimizations?: {
    connectionType: string;
    batteryLevel: number;
    isLowPowerMode: boolean;
  };
}
