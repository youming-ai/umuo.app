# Data Model: Transcription Process Optimization & UI Improvements

**Date**: 2025-11-03  
**Feature**: Transcription Process Optimization & UI Improvements  
**Purpose**: Enhanced data structures for optimized transcription workflow, progress tracking, and mobile interactions

## Overview

This data model extends the existing database schema to support enhanced transcription workflow with chunked processing, real-time progress tracking, concurrent job management, and mobile-optimized interactions. All entities maintain backward compatibility with current implementation.

## Enhanced Entities

### 1. TranscriptionJob (Enhanced)

**Purpose**: Manages individual transcription tasks with enhanced tracking and chunking support

```typescript
interface TranscriptionJob {
  // Core identification
  id: string;
  fileId: number;
  userId?: string;
  
  // Job metadata
  status: 'queued' | 'uploading' | 'processing' | 'chunking' | 'transcribing' | 'post-processing' | 'completed' | 'failed' | 'cancelled';
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
  currentStage: 'upload' | 'transcription' | 'post-processing' | 'completed' | 'failed';
  stageProgress: {
    upload: { completed: boolean; progress: number; duration?: number; bytesUploaded: number; totalBytes: number };
    transcription: { completed: boolean; progress: number; eta?: number; wordsProcessed: number; totalWords?: number };
    'post-processing': { completed: boolean; progress: number; segmentsProcessed: number; totalSegments: number };
  };
  overallProgress: number; // 0-100
  
  // Performance metrics
  queueTime: number; // milliseconds from creation to start
  processingTime: number; // milliseconds total processing
  uploadSpeed: number; // bytes per second
  transcriptionSpeed: number; // audio seconds per processing second
  
  // Error handling
  errorType?: 'network' | 'api_key' | 'rate_limit' | 'quota_exceeded' | 'file_too_large' | 'unsupported_format' | 'timeout' | 'server_error' | 'unknown';
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  
  // Configuration
  language: string;
  model: string; // e.g., "whisper-large-v3-turbo"
  temperature: number;
  responseFormat: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
  timestampGranularities: ('word' | 'segment')[];
  
  // Mobile-specific
  deviceType: 'desktop' | 'mobile' | 'tablet';
  networkType: 'wifi' | 'cellular' | 'unknown';
  uploadMethod: 'direct' | 'chunked';
}
```

### 2. AudioChunk (New Entity)

**Purpose**: Manages individual audio chunks for chunked transcription processing

```typescript
interface AudioChunk {
  // Core identification
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
  status: 'pending' | 'uploading' | 'uploaded' | 'transcribing' | 'completed' | 'failed';
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
```

### 3. ProgressTracker (New Entity)

**Purpose**: Real-time progress tracking with stage-specific details

```typescript
interface ProgressTracker {
  // Core identification
  id: string;
  jobId: string;
  fileId: number;
  
  // Progress state
  currentStage: 'upload' | 'transcription' | 'post-processing' | 'completed' | 'failed';
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
    'post-processing': {
      progress: number; // 0-100
      segmentsProcessed: number;
      totalSegments: number;
      currentOperation: 'normalization' | 'translation' | 'annotation' | 'furigana';
      startTime?: Date;
      lastUpdate: Date;
    };
  };
  
  // Messages and feedback
  currentMessage: string;
  lastMessageUpdate: Date;
  
  // Connection management
  connectionType: 'sse' | 'polling' | 'periodic';
  lastActivity: Date;
  connectionHealth: 'healthy' | 'degraded' | 'disconnected';
  
  // Mobile-specific
  deviceInfo?: {
    type: 'mobile' | 'desktop' | 'tablet';
    networkType: 'wifi' | 'cellular' | 'unknown';
    batteryLevel?: number; // 0-1
    isLowPowerMode: boolean;
  };
}
```

### 4. ConcurrentJobManager (New Entity)

**Purpose**: Manages multiple concurrent transcription jobs with priority queuing

```typescript
interface ConcurrentJobManager {
  // Queue management
  queue: TranscriptionJob[];
  activeJobs: Map<string, TranscriptionJob>;
  completedJobs: TranscriptionJob[];
  failedJobs: TranscriptionJob[];
  
  // Configuration
  maxConcurrency: number;
  currentConcurrency: number;
  
  // Statistics
  totalJobsProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  
  // Performance metrics
  queueLength: number;
  averageWaitTime: number;
  throughput: number; // jobs per hour
  
  // Rate limiting
  apiRateLimit: {
    requestsPerMinute: number;
    currentRequests: number;
    resetTime: Date;
  };
  
  // Health monitoring
  systemHealth: 'healthy' | 'degraded' | 'overloaded';
  lastHealthCheck: Date;
}
```

### 5. MobileInteraction (New Entity)

**Purpose**: Tracks mobile-specific user interactions and touch gestures

```typescript
interface MobileInteraction {
  // Core identification
  id: string;
  jobId?: number;
  userId?: string;
  sessionId: string;
  
  // Interaction details
  interactionType: 'tap' | 'double_tap' | 'swipe' | 'drag' | 'pinch' | 'long_press';
  targetElement: 'play_button' | 'progress_bar' | 'volume_control' | 'speed_control' | 'upload_area' | 'file_item';
  timestamp: Date;
  
  // Touch gesture data
  gestureData?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration: number; // milliseconds
    velocity: number;
    direction: 'up' | 'down' | 'left' | 'right';
  };
  
  // Device context
  deviceInfo: {
    type: 'mobile' | 'tablet';
    screenSize: { width: number; height: number };
    userAgent: string;
    touchPoints: number;
  };
  
  // Performance metrics
  responseTime: number; // milliseconds from interaction to UI response
  successfulInteraction: boolean;
  
  // Error tracking
  errorType?: 'touch_not_recognized' | 'target_missed' | 'response_timeout' | 'system_error';
  errorMessage?: string;
}
```

### 6. PerformanceMetrics (Enhanced)

**Purpose**: Enhanced performance monitoring for optimization tracking

```typescript
interface PerformanceMetrics {
  // Core identification
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
    connectionType: 'sse' | 'polling' | 'periodic';
    updateFrequency: number; // milliseconds between updates
    missedUpdates: number;
    connectionDrops: number;
    reconnectionTime: number; // milliseconds
  };
  
  // Mobile performance
  mobileMetrics?: {
    deviceType: 'mobile' | 'tablet' | 'desktop';
    networkType: 'wifi' | 'cellular' | 'unknown';
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
```

## Database Schema Changes

### IndexedDB (Dexie) Schema Updates

```typescript
// Enhanced database schema for version 4
const db = new Dexie('umuo-app-db');
db.version(4).stores({
  // Existing tables (unchanged)
  files: '++id, name, size, type, blob, createdAt, status, duration, language',
  transcripts: '++id, fileId, status, createdAt, updatedAt, text, summary, language, model',
  segments: '++id, transcriptId, start, end, text, normalizedText, translation, annotations, furigana, words',
  
  // Enhanced tables
  files: '++id, name, size, type, blob, createdAt, status, duration, language, isChunked, totalChunks, deviceType, uploadMethod',
  transcripts: '++id, fileId, status, createdAt, updatedAt, text, summary, language, model, priority, retryCount, errorType, processingTime, queueTime',
  
  // New tables
  transcriptionJobs: '++id, fileId, status, priority, createdAt, startedAt, completedAt, isChunked, totalChunks, currentStage, overallProgress, errorType, retryCount',
  audioChunks: '++id, jobId, chunkIndex, startTime, endTime, duration, size, status, uploadedAt, transcribedAt, transcriptionId',
  progressTrackers: '++id, jobId, fileId, currentStage, overallProgress, connectionType, lastActivity, connectionHealth',
  mobileInteractions: '++id, jobId, sessionId, interactionType, targetElement, timestamp, deviceType, responseTime',
  performanceMetrics: '++id, jobId, timestamp, success, errorType, processingTime, audioSize, model',
});
```

## State Management Schema

### TanStack Query Keys Structure

```typescript
// Enhanced query keys for optimization features
export const transcriptionKeys = {
  all: ['transcription'] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, 'file', fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), 'progress'] as const,
  detailedProgress: (fileId: number) => [...transcriptionKeys.forFile(fileId), 'detailed-progress'] as const,
  chunks: (fileId: number) => [...transcriptionKeys.forFile(fileId), 'chunks'] as const,
  performance: (fileId: number) => [...transcriptionKeys.forFile(fileId), 'performance'] as const,
};

export const jobKeys = {
  all: ['jobs'] as const,
  queue: () => [...jobKeys.all, 'queue'] as const,
  active: () => [...jobKeys.all, 'active'] as const,
  completed: () => [...jobKeys.all, 'completed'] as const,
  forId: (jobId: string) => [...jobKeys.all, 'id', jobId] as const,
};

export const mobileKeys = {
  all: ['mobile'] as const,
  interactions: (sessionId?: string) => [...mobileKeys.all, 'interactions', sessionId].filter(Boolean) as const,
  deviceInfo: () => [...mobileKeys.all, 'device-info'] as const,
  performance: () => [...mobileKeys.all, 'performance'] as const,
};
```

## Validation Schemas (Zod)

### Enhanced Transcription Request Schema

```typescript
const transcriptionRequestSchema = z.object({
  // Core request
  audio: z.instanceof(File).refine(file => file.size > 0, 'Audio file is required'),
  language: z.string().default('auto'),
  
  // Enhanced options
  priority: z.number().min(0).max(10).default(0),
  enableChunking: z.boolean().default(false),
  chunkSize: z.number().min(1024 * 1024).max(50 * 1024 * 1024).optional(), // 1MB to 50MB
  
  // Progress tracking
  enableProgressTracking: z.boolean().default(true),
  progressUpdateInterval: z.number().min(1000).max(10000).default(2000), // 1-10 seconds
  
  // Mobile-specific
  deviceInfo: z.object({
    type: z.enum(['desktop', 'mobile', 'tablet']),
    networkType: z.enum(['wifi', 'cellular', 'unknown']).optional(),
    batteryLevel: z.number().min(0).max(1).optional(),
    isLowPowerMode: z.boolean().default(false),
  }).optional(),
});

const transcriptionJobSchema = z.object({
  id: z.string(),
  fileId: z.number(),
  status: z.enum(['queued', 'uploading', 'processing', 'chunking', 'transcribing', 'post-processing', 'completed', 'failed', 'cancelled']),
  priority: z.number().min(0).max(10),
  createdAt: z.date(),
  isChunked: z.boolean(),
  totalChunks: z.number().min(1),
  currentStage: z.enum(['upload', 'transcription', 'post-processing', 'completed', 'failed']),
  overallProgress: z.number().min(0).max(100),
  errorType: z.enum(['network', 'api_key', 'rate_limit', 'quota_exceeded', 'file_too_large', 'unsupported_format', 'timeout', 'server_error', 'unknown']).optional(),
});
```

## Migration Strategy

### Version 4 Migration (from current v3)

```typescript
// Migration script for database version 4
db.version(4).stores({
  // Enhanced existing tables
  files: '++id, name, size, type, blob, createdAt, status, duration, language, isChunked, totalChunks, deviceType, uploadMethod',
  transcripts: '++id, fileId, status, createdAt, updatedAt, text, summary, language, model, priority, retryCount, errorType, processingTime, queueTime',
  
  // New tables
  transcriptionJobs: '++id, fileId, status, priority, createdAt, startedAt, completedAt, isChunked, totalChunks, currentStage, overallProgress, errorType, retryCount',
  audioChunks: '++id, jobId, chunkIndex, startTime, endTime, duration, size, status, uploadedAt, transcribedAt, transcriptionId',
  progressTrackers: '++id, jobId, fileId, currentStage, overallProgress, connectionType, lastActivity, connectionHealth',
  mobileInteractions: '++id, jobId, sessionId, interactionType, targetElement, timestamp, deviceType, responseTime',
  performanceMetrics: '++id, jobId, timestamp, success, errorType, processingTime, audioSize, model',
}).upgrade(async (trans) => {
  // Migrate existing files to enhanced schema
  const files = await trans.files.toCollection().toArray();
  for (const file of files) {
    // Add new fields with default values
    await trans.files.update(file.id, {
      isChunked: false,
      totalChunks: 1,
      deviceType: 'desktop',
      uploadMethod: 'direct',
    });
  }
  
  // Migrate existing transcripts to enhanced schema
  const transcripts = await trans.transcripts.toCollection().toArray();
  for (const transcript of transcripts) {
    await trans.transcripts.update(transcript.id, {
      priority: 0,
      retryCount: 0,
      processingTime: 0,
      queueTime: 0,
    });
  }
});
```

## API Response Formats

### Enhanced Progress Response

```typescript
interface ProgressResponse {
  jobId: string;
  fileId: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  overallProgress: number;
  currentStage: string;
  message: string;
  
  // Detailed stage progress
  stages: {
    upload: { progress: number; speed: number; eta?: number; bytesTransferred: number; totalBytes: number };
    transcription: { progress: number; currentChunk: number; totalChunks: number; eta?: number };
    'post-processing': { progress: number; segmentsProcessed: number; totalSegments: number };
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
```

## Data Flow

### Enhanced Transcription Flow

```
File Upload → Job Creation → Progress Tracking → Chunking (if needed) → Concurrent Processing → Progress Updates → Completion → Mobile Analytics
     ↓              ↓              ↓              ↓                    ↓              ↓               ↓
File Validation → Queue Management → SSE/Polling → Audio Processing → Progress Monitoring → UI Updates → Performance Metrics
```

### Progress Tracking Flow

```
User Action → ProgressTracker Creation → SSE Connection → Stage Monitoring → Progress Updates → UI Synchronization → Mobile Interaction Tracking
     ↓                ↓                    ↓              ↓                ↓              ↓                     ↓
Request Start → Database Storage → Event Stream → Real-time Updates → Query Invalidation → Component Updates → Analytics Collection
```

This enhanced data model supports all optimization features while maintaining backward compatibility and following the existing architectural patterns in the umuo.app codebase.