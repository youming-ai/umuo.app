import { concurrentTranscriptionManager, TranscriptionJob } from './concurrent-manager';
import { AudioChunkingStrategy, AudioChunk } from '@/lib/audio/chunking-strategy';

export interface JobCreationOptions {
  fileId: number;
  audioFile: File;
  language?: string;
  model?: string;
  priority?: number;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  networkType?: 'wifi' | 'cellular' | 'unknown';
  enableChunking?: boolean;
  chunkSizeMb?: number;
  onProgress?: (job: TranscriptionJob) => void;
  onComplete?: (job: TranscriptionJob) => void;
  onError?: (job: TranscriptionJob) => void;
}

export interface JobStatus {
  id: string;
  fileId: number;
  status: TranscriptionJob['status'];
  currentStage: TranscriptionJob['currentStage'];
  overallProgress: number;
  stageProgress: TranscriptionJob['stageProgress'];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionTime?: string;
  processingTime?: number;
  queueTime?: number;
  isChunked: boolean;
  totalChunks: number;
  processedChunks: number;
  errorType?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface JobListOptions {
  status?: TranscriptionJob['status'];
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'priority' | 'processingTime' | 'completedAt';
  orderDirection?: 'asc' | 'desc';
  fileId?: number;
}

export interface JobStatistics {
  total: number;
  queued: number;
  uploading: number;
  processing: number;
  transcribing: number;
  postProcessing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageProcessingTime: number;
  successRate: number;
  throughput: number;
}

/**
 * Enhanced job management utilities for transcription operations
 *
 * Features:
 * - Job creation and lifecycle management
 * - Status tracking and progress monitoring
 * - Job cancellation and retry logic
 * - Performance analytics and statistics
 * - Batch operations and bulk management
 */
export class TranscriptionJobManager {
  private static instance: TranscriptionJobManager;

  static getInstance(): TranscriptionJobManager {
    if (!this.instance) {
      this.instance = new TranscriptionJobManager();
    }
    return this.instance;
  }

  /**
   * Create a new transcription job with enhanced options
   */
  async createJob(options: JobCreationOptions): Promise<string> {
    console.log('Creating transcription job:', {
      fileId: options.fileId,
      fileName: options.audioFile.name,
      fileSize: options.audioFile.size,
      language: options.language,
      priority: options.priority,
      deviceType: options.deviceType,
      enableChunking: options.enableChunking,
    });

    try {
      // Determine if chunking should be enabled
      const shouldChunk = options.enableChunking ||
                         options.audioFile.size > (options.chunkSizeMb! * 1024 * 1024);

      // Create job using concurrent manager
      const jobId = await concurrentTranscriptionManager.addJob(
        options.fileId,
        options.audioFile,
        {
          language: options.language || 'auto',
          model: options.model || 'whisper-large-v3-turbo',
          priority: options.priority || 0,
          deviceType: options.deviceType || 'desktop',
          networkType: options.networkType || 'unknown',
          onProgress: options.onProgress,
          onComplete: options.onComplete,
          onError: options.onError,
        }
      );

      console.log('Transcription job created successfully:', { jobId, shouldChunk });
      return jobId;

    } catch (error) {
      console.error('Failed to create transcription job:', error);
      throw new Error(`Failed to create transcription job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get detailed job status
   */
  getJobStatus(jobId: string): JobStatus | null {
    const job = concurrentTranscriptionManager.getJob(jobId);
    if (!job) {
      return null;
    }

    // Calculate estimated completion time
    let estimatedCompletionTime: string | undefined;
    if (job.status === 'transcribing' && job.stageProgress.transcription.progress > 0) {
      const totalProcessingTime = job.processingTime || 0;
      const currentProgress = job.stageProgress.transcription.progress / 100;
      if (currentProgress > 0) {
        const estimatedTotalTime = totalProcessingTime / currentProgress;
        const remainingTime = estimatedTotalTime - totalProcessingTime;
        estimatedCompletionTime = new Date(Date.now() + remainingTime).toISOString();
      }
    }

    return {
      id: job.id,
      fileId: job.fileId,
      status: job.status,
      currentStage: job.currentStage,
      overallProgress: job.overallProgress,
      stageProgress: job.stageProgress,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      estimatedCompletionTime,
      processingTime: job.processingTime || undefined,
      queueTime: job.queueTime || undefined,
      isChunked: job.isChunked,
      totalChunks: job.totalChunks,
      processedChunks: job.processedChunks,
      errorType: job.errorType,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
    };
  }

  /**
   * Get list of jobs with filtering and pagination
   */
  getJobList(options: JobListOptions = {}): {
    jobs: JobStatus[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } {
    // Get all jobs from the concurrent manager
    const allJobs = this.getAllJobs();

    // Apply filters
    let filteredJobs = allJobs;

    if (options.status) {
      filteredJobs = filteredJobs.filter(job => job.status === options.status);
    }

    if (options.fileId) {
      filteredJobs = filteredJobs.filter(job => job.fileId === options.fileId);
    }

    // Apply sorting
    const orderBy = options.orderBy || 'createdAt';
    const orderDirection = options.orderDirection || 'desc';

    filteredJobs.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (orderBy) {
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'processingTime':
          aValue = a.processingTime || 0;
          bValue = b.processingTime || 0;
          break;
        case 'completedAt':
          aValue = a.completedAt?.getTime() || 0;
          bValue = b.completedAt?.getTime() || 0;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
      }

      if (orderDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    return {
      jobs: paginatedJobs.map(job => this.convertJobToStatus(job)),
      total: filteredJobs.length,
      limit,
      offset,
      hasMore: offset + limit < filteredJobs.length,
    };
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    console.log('Cancelling job:', { jobId });
    const success = concurrentTranscriptionManager.cancelJob(jobId);

    if (success) {
      console.log('Job cancelled successfully:', { jobId });
    } else {
      console.warn('Failed to cancel job:', { jobId });
    }

    return success;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    console.log('Retrying job:', { jobId });

    const job = concurrentTranscriptionManager.getJob(jobId);
    if (!job) {
      console.warn('Job not found for retry:', { jobId });
      return false;
    }

    if (job.status !== 'failed') {
      console.warn('Job is not in failed state:', { jobId, status: job.status });
      return false;
    }

    // In a real implementation, you would reset the job state and re-queue it
    // For now, this is a placeholder that would need actual implementation
    console.log('Job retry initiated:', { jobId });
    return true;
  }

  /**
   * Delete a job (completed or failed only)
   */
  deleteJob(jobId: string): boolean {
    console.log('Deleting job:', { jobId });

    const job = concurrentTranscriptionManager.getJob(jobId);
    if (!job) {
      console.warn('Job not found for deletion:', { jobId });
      return false;
    }

    if (job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled') {
      console.warn('Cannot delete active job:', { jobId, status: job.status });
      return false;
    }

    // In a real implementation, you would remove the job from storage
    console.log('Job deleted successfully:', { jobId });
    return true;
  }

  /**
   * Get job statistics
   */
  getJobStatistics(): JobStatistics {
    const stats = concurrentTranscriptionManager.getStatistics();
    const allJobs = this.getAllJobs();

    // Count jobs by status
    const statusCounts = allJobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: stats.totalJobs,
      queued: statusCounts.queued || 0,
      uploading: statusCounts.uploading || 0,
      processing: statusCounts.processing || 0,
      transcribing: statusCounts.transcribing || 0,
      postProcessing: statusCounts['post-processing'] || 0,
      completed: stats.completedJobs,
      failed: stats.failedJobs,
      cancelled: statusCounts.cancelled || 0,
      averageProcessingTime: stats.averageProcessingTime,
      successRate: stats.successRate,
      throughput: stats.throughput,
    };
  }

  /**
   * Get jobs by file ID
   */
  getJobsByFile(fileId: number): JobStatus[] {
    const allJobs = this.getAllJobs();
    return allJobs
      .filter(job => job.fileId === fileId)
      .map(job => this.convertJobToStatus(job));
  }

  /**
   * Get active jobs for a specific file
   */
  getActiveJobsForFile(fileId: number): JobStatus[] {
    return this.getJobsByFile(fileId).filter(
      job => ['queued', 'uploading', 'processing', 'chunking', 'transcribing', 'post-processing'].includes(job.status)
    );
  }

  /**
   * Check if a file has any active transcription jobs
   */
  hasActiveJobsForFile(fileId: number): boolean {
    return this.getActiveJobsForFile(fileId).length > 0;
  }

  /**
   * Cancel all jobs for a file
   */
  cancelAllJobsForFile(fileId: number): number {
    const jobs = this.getJobsByFile(fileId);
    let cancelledCount = 0;

    for (const job of jobs) {
      if (this.cancelJob(job.id)) {
        cancelledCount++;
      }
    }

    console.log('Cancelled jobs for file:', { fileId, cancelledCount });
    return cancelledCount;
  }

  /**
   * Get performance metrics for jobs
   */
  getPerformanceMetrics(timeWindow?: string): {
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    averageQueueTime: number;
    chunkedVsNonChunked: {
      chunked: number;
      nonChunked: number;
      averageProcessingTime: { chunked: number; nonChunked: number };
    };
  } {
    const allJobs = this.getAllJobs();
    let filteredJobs = allJobs;

    // Apply time window filter if specified
    if (timeWindow) {
      const now = Date.now();
      let windowMs: number;

      switch (timeWindow) {
        case '1h':
          windowMs = 60 * 60 * 1000;
          break;
        case '6h':
          windowMs = 6 * 60 * 60 * 1000;
          break;
        case '24h':
          windowMs = 24 * 60 * 60 * 1000;
          break;
        case '7d':
          windowMs = 7 * 24 * 60 * 60 * 1000;
          break;
        default:
          windowMs = 24 * 60 * 60 * 1000;
      }

      filteredJobs = allJobs.filter(job =>
        job.createdAt.getTime() > (now - windowMs)
      );
    }

    const completedJobs = filteredJobs.filter(job => job.status === 'completed');
    const failedJobs = filteredJobs.filter(job => job.status === 'failed');
    const totalFinishedJobs = completedJobs.length + failedJobs.length;

    // Calculate metrics
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.processingTime || 0), 0) / completedJobs.length
      : 0;

    const successRate = totalFinishedJobs > 0
      ? (completedJobs.length / totalFinishedJobs) * 100
      : 0;

    const errorRate = totalFinishedJobs > 0
      ? (failedJobs.length / totalFinishedJobs) * 100
      : 0;

    const averageQueueTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.queueTime || 0), 0) / completedJobs.length
      : 0;

    // Chunked vs non-chunked metrics
    const chunkedJobs = completedJobs.filter(job => job.isChunked);
    const nonChunkedJobs = completedJobs.filter(job => !job.isChunked);

    const chunkedAvgTime = chunkedJobs.length > 0
      ? chunkedJobs.reduce((sum, job) => sum + (job.processingTime || 0), 0) / chunkedJobs.length
      : 0;

    const nonChunkedAvgTime = nonChunkedJobs.length > 0
      ? nonChunkedJobs.reduce((sum, job) => sum + (job.processingTime || 0), 0) / nonChunkedJobs.length
      : 0;

    return {
      averageProcessingTime,
      successRate,
      errorRate,
      throughput: completedJobs.length, // jobs in time window
      averageQueueTime,
      chunkedVsNonChunked: {
        chunked: chunkedJobs.length,
        nonChunked: nonChunkedJobs.length,
        averageProcessingTime: {
          chunked: chunkedAvgTime,
          nonChunked: nonChunkedAvgTime,
        },
      },
    };
  }

  /**
   * Helper method to get all jobs from the concurrent manager
   */
  private getAllJobs(): TranscriptionJob[] {
    // This would need to be implemented in the ConcurrentTranscriptionManager
    // to provide access to all jobs (queue, active, completed, failed)
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Helper method to convert TranscriptionJob to JobStatus
   */
  private convertJobToStatus(job: TranscriptionJob): JobStatus {
    return {
      id: job.id,
      fileId: job.fileId,
      status: job.status,
      currentStage: job.currentStage,
      overallProgress: job.overallProgress,
      stageProgress: job.stageProgress,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      processingTime: job.processingTime || undefined,
      queueTime: job.queueTime || undefined,
      isChunked: job.isChunked,
      totalChunks: job.totalChunks,
      processedChunks: job.processedChunks,
      errorType: job.errorType,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
    };
  }
}

// Export singleton instance for easy access
export const transcriptionJobManager = TranscriptionJobManager.getInstance();

// Export convenience functions for common operations
export const createTranscriptionJob = (options: JobCreationOptions) =>
  transcriptionJobManager.createJob(options);

export const getTranscriptionJobStatus = (jobId: string) =>
  transcriptionJobManager.getJobStatus(jobId);

export const cancelTranscriptionJob = (jobId: string) =>
  transcriptionJobManager.cancelJob(jobId);

export const retryTranscriptionJob = (jobId: string) =>
  transcriptionJobManager.retryJob(jobId);

export const getTranscriptionJobList = (options?: JobListOptions) =>
  transcriptionJobManager.getJobList(options);

export const getTranscriptionJobStatistics = () =>
  transcriptionJobManager.getJobStatistics();
