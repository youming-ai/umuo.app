import { GroqClientFactory } from "@/lib/ai/groq-client-factory";
import { transcribeWithRetry } from "@/lib/ai/groq-retry-strategy";
import {
  AudioChunkingStrategy,
  AudioChunk,
  ChunkingResult,
} from "@/lib/audio/chunking-strategy";

export interface TranscriptionJob {
  id: string;
  fileId: number;
  status:
    | "queued"
    | "uploading"
    | "processing"
    | "chunking"
    | "transcribing"
    | "post-processing"
    | "completed"
    | "failed"
    | "cancelled";
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Chunking information
  isChunked: boolean;
  totalChunks: number;
  processedChunks: number;
  chunks: AudioChunk[];

  // Progress tracking
  currentStage:
    | "upload"
    | "transcription"
    | "post-processing"
    | "completed"
    | "failed";
  stageProgress: {
    upload: { completed: boolean; progress: number; duration?: number };
    transcription: { completed: boolean; progress: number; eta?: number };
    "post-processing": { completed: boolean; progress: number };
  };
  overallProgress: number;

  // Performance metrics
  queueTime: number;
  processingTime: number;
  uploadSpeed: number;
  transcriptionSpeed: number;

  // Error handling
  errorType?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;

  // Configuration
  language: string;
  model: string;
  temperature: number;

  // Mobile-specific
  deviceType: "desktop" | "mobile" | "tablet";
  networkType: "wifi" | "cellular" | "unknown";
}

export interface ConcurrentManagerConfig {
  maxConcurrency: number;
  maxQueueSize: number;
  defaultRetryCount: number;
  queueTimeoutMs: number;
  jobTimeoutMs: number;
  enablePriorityQueue: boolean;
  mobileOptimizations: boolean;
}

export interface JobStatistics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueLength: number;
  averageProcessingTime: number;
  successRate: number;
  throughput: number; // jobs per hour
}

export const DEFAULT_CONCURRENT_CONFIG: ConcurrentManagerConfig = {
  maxConcurrency: parseInt(process.env.GROQ_MAX_CONCURRENCY || "2"),
  maxQueueSize: 50,
  defaultRetryCount: parseInt(process.env.GROQ_MAX_RETRIES || "2"),
  queueTimeoutMs: 30 * 60 * 1000, // 30 minutes
  jobTimeoutMs: 10 * 60 * 1000, // 10 minutes
  enablePriorityQueue: true,
  mobileOptimizations: false,
};

/**
 * Concurrent transcription job manager with priority queuing and resource management
 *
 * Features:
 * - Priority-based job queue
 * - Configurable concurrency limits
 * - Automatic retry and error handling
 * - Progress tracking and monitoring
 * - Resource optimization and cleanup
 * - Mobile-aware scheduling
 */
export class ConcurrentTranscriptionManager {
  private config: ConcurrentManagerConfig;
  private queue: TranscriptionJob[] = [];
  private activeJobs: Map<string, TranscriptionJob> = new Map();
  private completedJobs: TranscriptionJob[] = [];
  private failedJobs: TranscriptionJob[] = [];
  private jobCallbacks: Map<
    string,
    {
      onProgress?: (job: TranscriptionJob) => void;
      onComplete?: (job: TranscriptionJob) => void;
      onError?: (job: TranscriptionJob) => void;
    }
  > = new Map();

  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(config: Partial<ConcurrentManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONCURRENT_CONFIG, ...config };
    this.startProcessing();
    this.startCleanup();
  }

  /**
   * Add a new transcription job to the queue
   */
  async addJob(
    fileId: number,
    audioFile: File,
    options: {
      language?: string;
      model?: string;
      priority?: number;
      deviceType?: "desktop" | "mobile" | "tablet";
      networkType?: "wifi" | "cellular" | "unknown";
      onProgress?: (job: TranscriptionJob) => void;
      onComplete?: (job: TranscriptionJob) => void;
      onError?: (job: TranscriptionJob) => void;
    } = {},
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error("Transcription queue is full. Please try again later.");
    }

    // Determine if chunking is needed
    const shouldChunk = audioFile.size > 15 * 1024 * 1024; // 15MB threshold
    let chunks: AudioChunk[] = [];

    if (shouldChunk) {
      const chunkingStrategy = new AudioChunkingStrategy({
        mobileOptimized: this.config.mobileOptimizations,
        networkType: options.networkType || "unknown",
      });

      const chunkingResult =
        await chunkingStrategy.calculateChunking(audioFile);
      chunks = await chunkingStrategy.generateAudioChunks(
        audioFile,
        chunkingResult,
      );
    }

    const job: TranscriptionJob = {
      id: jobId,
      fileId,
      status: "queued",
      priority: options.priority || 0,
      createdAt: new Date(),
      isChunked: shouldChunk,
      totalChunks: chunks.length || 1,
      processedChunks: 0,
      chunks,
      currentStage: "upload",
      stageProgress: {
        upload: { completed: false, progress: 0 },
        transcription: { completed: false, progress: 0 },
        "post-processing": { completed: false, progress: 0 },
      },
      overallProgress: 0,
      queueTime: 0,
      processingTime: 0,
      uploadSpeed: 0,
      transcriptionSpeed: 0,
      retryCount: 0,
      maxRetries: this.config.defaultRetryCount,
      language: options.language || "auto",
      model: options.model || "whisper-large-v3-turbo",
      temperature: 0.0,
      deviceType: options.deviceType || "desktop",
      networkType: options.networkType || "unknown",
    };

    // Store callbacks
    if (options.onProgress || options.onComplete || options.onError) {
      this.jobCallbacks.set(jobId, {
        onProgress: options.onProgress,
        onComplete: options.onComplete,
        onError: options.onError,
      });
    }

    // Add to queue
    this.addToQueue(job);

    console.log(
      `Added transcription job ${jobId} to queue (priority: ${job.priority}, chunked: ${shouldChunk})`,
    );
    return jobId;
  }

  /**
   * Add job to queue with priority ordering
   */
  private addToQueue(job: TranscriptionJob): void {
    if (this.config.enablePriorityQueue) {
      // Insert job in priority order (higher priority first)
      let insertIndex = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (job.priority > this.queue[i].priority) {
          insertIndex = i;
          break;
        }
      }
      this.queue.splice(insertIndex, 0, job);
    } else {
      this.queue.push(job);
    }
  }

  /**
   * Start processing jobs from the queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, 1000); // Check every second
  }

  /**
   * Process jobs from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Start as many jobs as we have capacity for
      while (
        this.activeJobs.size < this.config.maxConcurrency &&
        this.queue.length > 0
      ) {
        const job = this.queue.shift()!;

        // Check if job has timed out in queue
        const queueTime = Date.now() - job.createdAt.getTime();
        if (queueTime > this.config.queueTimeoutMs) {
          job.status = "failed";
          job.errorType = "queue_timeout";
          job.errorMessage = "Job timed out in queue";
          this.failedJobs.push(job);
          this.notifyError(job);
          continue;
        }

        // Start processing the job
        this.activeJobs.set(job.id, job);
        job.status = "processing";
        job.startedAt = new Date();
        job.queueTime = queueTime;

        // Process job asynchronously
        this.processJob(job).catch((error) => {
          console.error(`Error processing job ${job.id}:`, error);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single transcription job
   */
  private async processJob(job: TranscriptionJob): Promise<void> {
    try {
      console.log(`Starting transcription job ${job.id}`);

      // Stage 1: Upload (if chunked)
      if (job.isChunked) {
        job.currentStage = "upload";
        job.status = "uploading";
        await this.processUpload(job);
      }

      // Stage 2: Transcription
      job.currentStage = "transcription";
      job.status = "transcribing";
      await this.processTranscription(job);

      // Stage 3: Post-processing
      job.currentStage = "post-processing";
      job.status = "post-processing";
      await this.processPostProcessing(job);

      // Job completed successfully
      job.status = "completed";
      job.completedAt = new Date();
      job.currentStage = "completed";
      job.overallProgress = 100;
      job.stageProgress.upload.completed = true;
      job.stageProgress.transcription.completed = true;
      job.stageProgress["post-processing"].completed = true;

      // Calculate final metrics
      job.processingTime = job.completedAt.getTime() - job.startedAt!.getTime();

      // Move to completed jobs
      this.activeJobs.delete(job.id);
      this.completedJobs.push(job);

      console.log(
        `Completed transcription job ${job.id} in ${job.processingTime}ms`,
      );
      this.notifyComplete(job);
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  /**
   * Process upload stage for chunked jobs
   */
  private async processUpload(job: TranscriptionJob): Promise<void> {
    if (!job.isChunked) return;

    const startTime = Date.now();
    let uploadedBytes = 0;
    const totalBytes = job.chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    for (let i = 0; i < job.chunks.length; i++) {
      const chunk = job.chunks[i];

      // Simulate upload progress
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 400),
      );

      uploadedBytes += chunk.size;
      job.processedChunks = i + 1;

      // Update progress
      const uploadProgress = (uploadedBytes / totalBytes) * 100;
      job.stageProgress.upload.progress = uploadProgress;
      job.overallProgress = Math.round(uploadProgress * 0.1); // Upload is 10% of total progress

      this.notifyProgress(job);
    }

    const uploadTime = Date.now() - startTime;
    job.uploadSpeed = totalBytes / (uploadTime / 1000); // bytes per second
    job.stageProgress.upload.completed = true;
    job.stageProgress.upload.duration = uploadTime;
  }

  /**
   * Process transcription stage
   */
  private async processTranscription(job: TranscriptionJob): Promise<void> {
    const startTime = Date.now();
    const groqClientFactory = GroqClientFactory.getInstance();

    if (job.isChunked) {
      // Process chunks concurrently within limits
      const concurrency = Math.min(
        this.config.maxConcurrency,
        job.chunks.length,
      );

      const chunksPerBatch = Math.ceil(job.chunks.length / concurrency);

      for (let i = 0; i < job.chunks.length; i += chunksPerBatch) {
        const batch = job.chunks.slice(i, i + chunksPerBatch);

        await Promise.all(
          batch.map(async (chunk, index) => {
            try {
              const client = groqClientFactory.getClient({
                apiKey: process.env.GROQ_API_KEY!,
              });

              // Simulate transcription API call
              await this.simulateTranscription(chunk, client, job);

              // Update progress
              job.processedChunks++;
              const transcriptionProgress =
                (job.processedChunks / job.totalChunks) * 100;
              job.stageProgress.transcription.progress = transcriptionProgress;
              job.overallProgress = Math.round(
                10 + transcriptionProgress * 0.75,
              ); // 10% upload + 75% transcription

              this.notifyProgress(job);
            } catch (error) {
              console.error(`Error transcribing chunk ${chunk.id}:`, error);
              throw error;
            }
          }),
        );
      }
    } else {
      // Single file transcription
      const client = groqClientFactory.getClient({
        apiKey: process.env.GROQ_API_KEY!,
      });

      await this.simulateTranscription(null, client, job);
      job.stageProgress.transcription.completed = true;
      job.overallProgress = 85; // 10% upload + 75% transcription
      this.notifyProgress(job);
    }

    const transcriptionTime = Date.now() - startTime;
    job.transcriptionSpeed = job.isChunked
      ? job.chunks.reduce((sum, chunk) => sum + chunk.duration, 0) /
        (transcriptionTime / 1000)
      : 1; // Real implementation would calculate actual speed

    job.stageProgress.transcription.completed = true;
  }

  /**
   * Process post-processing stage
   */
  private async processPostProcessing(job: TranscriptionJob): Promise<void> {
    // Simulate post-processing (normalization, translation, etc.)
    const postProcessingSteps = ["normalization", "translation", "annotation"];

    for (let i = 0; i < postProcessingSteps.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 1000),
      );

      const progress = ((i + 1) / postProcessingSteps.length) * 100;
      job.stageProgress["post-processing"].progress = progress;
      job.overallProgress = Math.round(85 + progress * 0.15); // Final 15% for post-processing

      this.notifyProgress(job);
    }
  }

  /**
   * Simulate transcription API call (replace with actual Groq API call)
   */
  private async simulateTranscription(
    chunk: AudioChunk | null,
    client: any,
    job: TranscriptionJob,
  ): Promise<void> {
    const duration = chunk ? chunk.duration : 60; // Default 60 seconds for non-chunked
    const processingTime = Math.max(1000, duration * 100); // 100ms per second of audio

    await transcribeWithRetry(
      async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, processingTime));

        // Simulate occasional failures
        if (Math.random() < 0.05) {
          // 5% failure rate
          throw new Error("Simulated API failure");
        }

        return { text: "Simulated transcription result" };
      },
      {
        maxAttempts: job.maxRetries + 1,
        baseDelay: 1000,
        maxDelay: 5000,
      },
    );
  }

  /**
   * Handle job errors and implement retry logic
   */
  private async handleJobError(
    job: TranscriptionJob,
    error: any,
  ): Promise<void> {
    job.errorType = error.type || "unknown";
    job.errorMessage = error.message || "Unknown error occurred";
    job.retryCount++;

    console.error(
      `Job ${job.id} failed (attempt ${job.retryCount}):`,
      error.message,
    );

    // Check if we should retry
    if (job.retryCount <= job.maxRetries && this.isRetryableError(error)) {
      job.lastRetryAt = new Date();
      job.status = "queued";
      job.currentStage = "upload";

      // Reset progress for retry
      job.processedChunks = 0;
      job.stageProgress.upload.progress = 0;
      job.stageProgress.transcription.progress = 0;
      job.stageProgress["post-processing"].progress = 0;
      job.overallProgress = 0;

      // Remove from active jobs and re-queue
      this.activeJobs.delete(job.id);
      this.addToQueue(job);

      console.log(`Retrying job ${job.id} (attempt ${job.retryCount})`);
      this.notifyProgress(job);
    } else {
      // Job failed permanently
      job.status = "failed";
      job.completedAt = new Date();
      job.currentStage = "failed";

      if (job.startedAt) {
        job.processingTime =
          job.completedAt.getTime() - job.startedAt.getTime();
      }

      this.activeJobs.delete(job.id);
      this.failedJobs.push(job);

      console.error(
        `Job ${job.id} failed permanently after ${job.retryCount} attempts`,
      );
      this.notifyError(job);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || "";

    const retryableErrors = [
      "network",
      "timeout",
      "rate_limit",
      "connection",
      "temporary",
      "overloaded",
    ];

    return retryableErrors.some((retryableError) =>
      message.includes(retryableError),
    );
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex((job) => job.id === jobId);
    if (queueIndex !== -1) {
      const job = this.queue.splice(queueIndex, 1)[0];
      job.status = "cancelled";
      job.completedAt = new Date();
      this.failedJobs.push(job);
      return true;
    }

    // Check if job is active
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.status = "cancelled";
      activeJob.completedAt = new Date();
      this.activeJobs.delete(jobId);
      this.failedJobs.push(activeJob);
      return true;
    }

    return false;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): TranscriptionJob | undefined {
    // Check all job collections
    return (
      this.queue.find((job) => job.id === jobId) ||
      this.activeJobs.get(jobId) ||
      this.completedJobs.find((job) => job.id === jobId) ||
      this.failedJobs.find((job) => job.id === jobId)
    );
  }

  /**
   * Get queue statistics
   */
  getStatistics(): JobStatistics {
    const totalJobs =
      this.queue.length +
      this.activeJobs.size +
      this.completedJobs.length +
      this.failedJobs.length;
    const completedJobs = this.completedJobs.length;
    const failedJobs = this.failedJobs.length;
    const successfulJobs = completedJobs - failedJobs;

    // Calculate average processing time
    const completedJobTimes = this.completedJobs
      .filter((job) => job.processingTime > 0)
      .map((job) => job.processingTime);

    const averageProcessingTime =
      completedJobTimes.length > 0
        ? completedJobTimes.reduce((sum, time) => sum + time, 0) /
          completedJobTimes.length
        : 0;

    // Calculate success rate
    const successRate =
      completedJobs > 0 ? (successfulJobs / completedJobs) * 100 : 0;

    // Calculate throughput (jobs per hour)
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentCompletedJobs = this.completedJobs.filter(
      (job) => job.completedAt && job.completedAt.getTime() > oneHourAgo,
    ).length;

    const throughput = recentCompletedJobs; // jobs per hour

    return {
      totalJobs,
      activeJobs: this.activeJobs.size,
      completedJobs,
      failedJobs,
      queueLength: this.queue.length,
      averageProcessingTime,
      successRate,
      throughput,
    };
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(job: TranscriptionJob): void {
    const callbacks = this.jobCallbacks.get(job.id);
    if (callbacks?.onProgress) {
      try {
        callbacks.onProgress(job);
      } catch (error) {
        console.error(`Error in progress callback for job ${job.id}:`, error);
      }
    }
  }

  /**
   * Notify completion callbacks
   */
  private notifyComplete(job: TranscriptionJob): void {
    const callbacks = this.jobCallbacks.get(job.id);
    if (callbacks?.onComplete) {
      try {
        callbacks.onComplete(job);
      } catch (error) {
        console.error(`Error in completion callback for job ${job.id}:`, error);
      }
    }

    // Clean up callbacks
    this.jobCallbacks.delete(job.id);
  }

  /**
   * Notify error callbacks
   */
  private notifyError(job: TranscriptionJob): void {
    const callbacks = this.jobCallbacks.get(job.id);
    if (callbacks?.onError) {
      try {
        callbacks.onError(job);
      } catch (error) {
        console.error(`Error in error callback for job ${job.id}:`, error);
      }
    }

    // Clean up callbacks
    this.jobCallbacks.delete(job.id);
  }

  /**
   * Start cleanup interval for old jobs
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldJobs();
      },
      10 * 60 * 1000,
    ); // Run every 10 minutes
  }

  /**
   * Clean up old completed and failed jobs
   */
  private cleanupOldJobs(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean up completed jobs
    const initialCompletedLength = this.completedJobs.length;
    this.completedJobs = this.completedJobs.filter(
      (job) => job.completedAt && job.completedAt.getTime() > cutoffTime,
    );

    // Clean up failed jobs
    const initialFailedLength = this.failedJobs.length;
    this.failedJobs = this.failedJobs.filter(
      (job) => job.completedAt && job.completedAt.getTime() > cutoffTime,
    );

    const cleanedUpCompleted =
      initialCompletedLength - this.completedJobs.length;
    const cleanedUpFailed = initialFailedLength - this.failedJobs.length;

    if (cleanedUpCompleted > 0 || cleanedUpFailed > 0) {
      console.log(
        `Cleaned up ${cleanedUpCompleted} completed and ${cleanedUpFailed} failed jobs`,
      );
    }
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs) {
      job.status = "cancelled";
      job.completedAt = new Date();
      this.failedJobs.push(job);
    }

    this.activeJobs.clear();
    this.jobCallbacks.clear();

    console.log("ConcurrentTranscriptionManager shutdown complete");
  }

  /**
   * Get current configuration
   */
  getConfig(): ConcurrentManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConcurrentManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance for easy access
export const concurrentTranscriptionManager =
  new ConcurrentTranscriptionManager();
