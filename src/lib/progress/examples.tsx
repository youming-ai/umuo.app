/**
 * Progress Tracker Usage Examples
 *
 * Demonstrates how to use the ProgressTracker system in various scenarios
 * including file uploads, transcription processes, and mobile optimization.
 */

import { progressTrackerManager, type ProgressTracker } from '../db/progress-tracker';
import { useFileProgress, useAutoProgressTracker, ProgressCalculator } from './progress-utils';

/**
 * Example 1: Basic Progress Tracker for File Upload
 */
export async function createUploadProgressTracker(fileId: number, fileSize: number) {
  try {
    // Create tracker for upload process
    const tracker = await progressTrackerManager.createTracker({
      jobId: `upload_${fileId}_${Date.now()}`,
      fileId,
      connectionType: 'sse', // Real-time updates for desktop
      initialStage: 'upload',
      message: 'Starting file upload...',
    });

    // Simulate upload progress
    simulateUploadProgress(tracker, fileSize);

    return tracker;
  } catch (error) {
    console.error('Failed to create upload progress tracker:', error);
    throw error;
  }
}

/**
 * Example 2: Mobile-Optimized Progress Tracker
 */
export async function createMobileProgressTracker(fileId: number) {
  try {
    // Create tracker optimized for mobile devices
    const tracker = await progressTrackerManager.createTracker({
      jobId: `mobile_${fileId}_${Date.now()}`,
      fileId,
      connectionType: 'polling', // Polling for better mobile compatibility
      deviceInfo: {
        type: 'mobile',
        networkType: 'cellular', // Assume cellular for mobile
        batteryLevel: 0.8, // 80% battery
        isLowPowerMode: false,
      },
      initialStage: 'upload',
      message: 'Preparing for mobile upload...',
    });

    // Get mobile optimizations
    const optimizations = tracker.getMobileOptimizations();
    console.log('Mobile optimizations enabled:', optimizations);

    return tracker;
  } catch (error) {
    console.error('Failed to create mobile progress tracker:', error);
    throw error;
  }
}

/**
 * Example 3: Complete Transcription Progress Tracking
 */
export async function createTranscriptionProgressTracker(fileId: number, totalChunks: number = 5) {
  try {
    const tracker = await progressTrackerManager.createTracker({
      jobId: `transcription_${fileId}_${Date.now()}`,
      fileId,
      connectionType: 'sse',
      initialStage: 'upload',
      message: 'Initializing transcription process...',
    });

    // Set up event listeners
    tracker.on('progress', (progress) => {
      console.log(`Progress: ${progress.overallProgress}% - ${progress.message}`);
    });

    tracker.on('stageChange', (stage, previousStage) => {
      console.log(`Stage changed: ${previousStage} → ${stage}`);
    });

    tracker.on('complete', () => {
      console.log('Transcription completed!');
    });

    tracker.on('error', (error) => {
      console.error('Progress tracking error:', error);
    });

    // Simulate complete transcription workflow
    await simulateCompleteWorkflow(tracker, totalChunks);

    return tracker;
  } catch (error) {
    console.error('Failed to create transcription progress tracker:', error);
    throw error;
  }
}

/**
 * Example 4: React Hook Usage
 */
export function TranscriptionProgressComponent({ fileId }: { fileId: number }) {
  // Auto-create tracker if it doesn't exist
  const autoCreateTracker = useAutoProgressTracker(fileId);

  // Track progress for the file
  const {
    tracker,
    entity,
    isLoading,
    error,
  } = useFileProgress(fileId, {
    onUpdate: (progress) => {
      console.log('Progress update:', progress);
    },
    onStageChange: (stage, previousStage) => {
      console.log('Stage changed:', previousStage, '→', stage);
    },
    onComplete: () => {
      console.log('Transcription completed!');
    },
    onError: (error) => {
      console.error('Progress error:', error);
    },
  });

  const handleStartTranscription = async () => {
    try {
      await autoCreateTracker('transcription');
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  if (isLoading) {
    return <div>Loading progress tracker...</div>;
  }

  if (error) {
    return <div>Error loading progress: {error.message}</div>;
  }

  if (!entity) {
    return (
      <div>
        <p>No active transcription</p>
        <button onClick={handleStartTranscription}>
          Start Transcription
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3>Transcription Progress</h3>
      <div>
        <strong>Overall Progress:</strong> {entity.overallProgress}%
      </div>
      <div>
        <strong>Current Stage:</strong> {entity.currentStage}
      </div>
      <div>
        <strong>Status:</strong> {entity.connectionHealth}
      </div>

      {/* Stage-specific progress */}
      <div style={{ marginTop: '1rem' }}>
        <h4>Upload: {entity.stages.upload.progress}%</h4>
        {entity.stages.upload.totalBytes > 0 && (
          <div>
            Speed: {ProgressCalculator.formatSpeed(entity.stages.upload.speed)}
            {entity.stages.upload.eta && (
              <span> ETA: {ProgressCalculator.formatETA(entity.stages.upload.eta)}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h4>Transcription: {entity.stages.transcription.progress}%</h4>
        {entity.stages.transcription.totalChunks > 0 && (
          <div>
            Chunk: {entity.stages.transcription.currentChunk}/{entity.stages.transcription.totalChunks}
            {entity.stages.transcription.eta && (
              <span> ETA: {ProgressCalculator.formatETA(entity.stages.transcription.eta)}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h4>Post-processing: {entity.stages['post-processing'].progress}%</h4>
        <div>
          Operation: {entity.stages['post-processing'].currentOperation}
          <br />
          Segments: {entity.stages['post-processing'].segmentsProcessed}/
          {entity.stages['post-processing'].totalSegments}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <strong>Message:</strong> {entity.currentMessage}
      </div>
    </div>
  );
}

/**
 * Example 5: Batch Progress Tracking
 */
export class BatchTranscriptionManager {
  private trackers = new Map<number, ProgressTracker>();

  async addFile(fileId: number, fileSize: number): Promise<void> {
    try {
      const tracker = await progressTrackerManager.createTracker({
        jobId: `batch_${fileId}_${Date.now()}`,
        fileId,
        connectionType: 'periodic', // Less frequent updates for batch processing
        initialStage: 'upload',
        message: 'Queued for batch processing...',
      });

      this.trackers.set(fileId, tracker);
    } catch (error) {
      console.error(`Failed to add file ${fileId} to batch:`, error);
      throw error;
    }
  }

  async startBatchProcessing(): Promise<void> {
    const files = Array.from(this.trackers.keys());

    for (const fileId of files) {
      const tracker = this.trackers.get(fileId);
      if (!tracker) continue;

      try {
        // Start with upload stage
        await tracker.updateProgress({
          stage: 'upload',
          progress: 0,
          message: 'Starting file upload...',
        });

        // Simulate upload
        await this.simulateUpload(tracker, fileId);

        // Move to transcription
        await tracker.updateProgress({
          stage: 'transcription',
          progress: 0,
          message: 'Starting transcription...',
        });

        // Simulate transcription
        await this.simulateTranscription(tracker);

      } catch (error) {
        console.error(`Failed to process file ${fileId}:`, error);
        await tracker.updateProgress({
          stage: 'upload',
          progress: 0,
          message: `Error: ${error.message}`,
        });
      }
    }
  }

  getProgress(): { fileId: number; progress: number; stage: string }[] {
    return Array.from(this.trackers.entries()).map(([fileId, tracker]) => ({
      fileId,
      progress: tracker.getEntity().overallProgress,
      stage: tracker.getEntity().currentStage,
    }));
  }

  async cleanup(): Promise<void> {
    for (const [fileId, tracker] of this.trackers) {
      try {
        await progressTrackerManager.deleteTracker(tracker.getEntity().id);
      } catch (error) {
        console.error(`Failed to cleanup tracker for file ${fileId}:`, error);
      }
    }
    this.trackers.clear();
  }

  private async simulateUpload(tracker: ProgressTracker, fileId: number): Promise<void> {
    const totalSize = Math.random() * 50 * 1024 * 1024; // Random size up to 50MB
    let uploaded = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks

    while (uploaded < totalSize) {
      uploaded = Math.min(uploaded + chunkSize, totalSize);
      const progress = (uploaded / totalSize) * 100;

      await tracker.updateProgress({
        stage: 'upload',
        progress,
        message: `Uploading ${ProgressCalculator.formatSpeed(uploaded / 10)}...`,
        metadata: {
          bytesTransferred: uploaded,
          totalBytes: totalSize,
        },
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private async simulateTranscription(tracker: ProgressTracker): Promise<void> {
    const totalChunks = Math.floor(Math.random() * 10) + 5; // 5-15 chunks

    for (let i = 0; i < totalChunks; i++) {
      const progress = ((i + 1) / totalChunks) * 100;

      await tracker.updateProgress({
        stage: 'transcription',
        progress,
        message: `Processing chunk ${i + 1}/${totalChunks}...`,
        metadata: {
          currentChunk: i + 1,
          totalChunks,
          chunkTime: Math.random() * 2000 + 1000, // 1-3 seconds per chunk
        },
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Move to post-processing
    await tracker.updateProgress({
      stage: 'post-processing',
      progress: 0,
      message: 'Post-processing transcript...',
    });

    // Simulate post-processing
    const operations = ['normalization', 'translation', 'annotation', 'furigana'] as const;
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const progress = ((i + 1) / operations.length) * 100;

      await tracker.updateProgress({
        stage: 'post-processing',
        progress,
        message: `${operation.charAt(0).toUpperCase() + operation.slice(1)} text...`,
        metadata: {
          currentOperation: operation,
          segmentsProcessed: (i + 1) * 10,
          totalSegments: 40,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

/**
 * Example 6: Connection Health Monitoring
 */
export class ConnectionHealthMonitor {
  private tracker: ProgressTracker;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(tracker: ProgressTracker) {
    this.tracker = tracker;
  }

  startMonitoring(intervalMs: number = 5000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const startTime = Date.now();

        // Simulate health check (could be a ping to server)
        await this.performHealthCheck();

        const responseTime = Date.now() - startTime;
        this.tracker.updateConnectionHealth('healthy', responseTime);

      } catch (error) {
        console.warn('Health check failed:', error);
        this.tracker.updateConnectionHealth('degraded');
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Simulate network request
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve();
        } else {
          reject(new Error('Health check failed'));
        }
      }, Math.random() * 1000 + 500); // 500-1500ms response time
    });
  }
}

// Simulation helper functions
async function simulateUploadProgress(tracker: ProgressTracker, fileSize: number): Promise<void> {
  const totalBytes = fileSize;
  let uploadedBytes = 0;
  const chunkSize = 1024 * 1024; // 1MB chunks

  while (uploadedBytes < totalBytes) {
    uploadedBytes = Math.min(uploadedBytes + chunkSize, totalBytes);
    const progress = (uploadedBytes / totalBytes) * 100;

    await tracker.updateProgress({
      stage: 'upload',
      progress,
      message: `Uploading ${Math.round(uploadedBytes / 1024 / 1024)}MB...`,
      metadata: {
        bytesTransferred: uploadedBytes,
        totalBytes,
      },
    });

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Upload completed');
}

async function simulateCompleteWorkflow(tracker: ProgressTracker, totalChunks: number): Promise<void> {
  // Stage 1: Upload
  console.log('Starting upload stage...');
  await simulateUploadProgress(tracker, 10 * 1024 * 1024); // 10MB file

  // Stage 2: Transcription
  console.log('Starting transcription stage...');
  for (let i = 0; i < totalChunks; i++) {
    const progress = ((i + 1) / totalChunks) * 100;

    await tracker.updateProgress({
      stage: 'transcription',
      progress,
      message: `Transcribing chunk ${i + 1}/${totalChunks}...`,
      metadata: {
        currentChunk: i + 1,
        totalChunks,
        chunkTime: Math.random() * 2000 + 1000,
      },
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Stage 3: Post-processing
  console.log('Starting post-processing stage...');
  const operations = ['normalization', 'translation', 'annotation'] as const;
  const totalSegments = 50;

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const progress = ((i + 1) / operations.length) * 100;
    const segmentsProcessed = (i + 1) * (totalSegments / operations.length);

    await tracker.updateProgress({
      stage: 'post-processing',
      progress,
      message: `${operation.charAt(0).toUpperCase() + operation.slice(1)} text...`,
      metadata: {
        currentOperation: operation,
        segmentsProcessed: Math.round(segmentsProcessed),
        totalSegments,
      },
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('Complete workflow finished');
}

// Export examples for easy testing
export const examples = {
  createUploadProgressTracker,
  createMobileProgressTracker,
  createTranscriptionProgressTracker,
  BatchTranscriptionManager,
  ConnectionHealthMonitor,
  TranscriptionProgressComponent,
};
