/**
 * Progress tracking types for real-time updates
 */

export interface ProgressUpdate {
  jobId: string;
  fileId: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  overallProgress: number;
  currentStage: string;
  message: string;
  timestamp: number;

  // Detailed stage information
  stages?: {
    upload?: {
      progress: number;
      speed: number;
      eta?: number;
      bytesTransferred: number;
      totalBytes: number;
    };
    transcription?: {
      progress: number;
      currentChunk: number;
      totalChunks: number;
      eta?: number;
    };
    'post-processing'?: {
      progress: number;
      segmentsProcessed: number;
      totalSegments: number;
    };
  };

  // Performance metrics
  processingTime?: number;
  queueTime?: number;

  // Error information
  error?: {
    type: string;
    message: string;
    suggestedAction: string;
  };

  // Mobile-specific optimizations
  mobileOptimizations?: {
    connectionType: string;
    batteryLevel: number;
    isLowPowerMode: boolean;
  };
}

export interface ProgressSubscription {
  jobId: string;
  onUpdate: (progress: ProgressUpdate) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export interface ChunkProgress {
  chunkIndex: number;
  totalChunks: number;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'transcribing' | 'completed' | 'failed';
  size: number;
  duration: number;
  uploadSpeed?: number;
  transcriptionSpeed?: number;
  error?: string;
}

export interface StageProgress {
  stage: 'upload' | 'transcription' | 'post-processing';
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  speed?: number;
  eta?: number;

  // Stage-specific data
  data?: {
    // Upload stage
    bytesTransferred?: number;
    totalBytes?: number;

    // Transcription stage
    currentChunk?: number;
    totalChunks?: number;
    wordsProcessed?: number;

    // Post-processing stage
    segmentsProcessed?: number;
    totalSegments?: number;
    currentOperation?: 'normalization' | 'translation' | 'annotation' | 'furigana';
  };
}

export interface ProgressCalculatorOptions {
  smoothingFactor?: number; // 0-1, for smoothing progress updates
  minUpdateInterval?: number; // milliseconds between updates
  enableETA?: boolean; // Calculate estimated time remaining
  historicalData?: ProgressUpdate[]; // Historical data for ETA calculations
}

export class ProgressCalculator {
  private smoothingFactor: number;
  private minUpdateInterval: number;
  private enableETA: boolean;
  private historicalData: ProgressUpdate[];

  constructor(options: ProgressCalculatorOptions = {}) {
    this.smoothingFactor = options.smoothingFactor || 0.3;
    this.minUpdateInterval = options.minUpdateInterval || 1000;
    this.enableETA = options.enableETA ?? true;
    this.historicalData = options.historicalData || [];
  }

  /**
   * Calculate overall progress from individual stages
   */
  calculateOverallProgress(stages: Record<string, StageProgress>): number {
    const weights = {
      upload: 0.1,      // 10%
      transcription: 0.75, // 75%
      'post-processing': 0.15 // 15%
    };

    let totalProgress = 0;
    let totalWeight = 0;

    for (const [stage, weight] of Object.entries(weights)) {
      const stageData = stages[stage];
      if (stageData) {
        totalProgress += stageData.progress * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalProgress) : 0;
  }

  /**
   * Calculate ETA based on current stage progress
   */
  calculateETA(stage: StageProgress): number | undefined {
    if (!this.enableETA || stage.progress <= 0 || !stage.startTime) {
      return undefined;
    }

    const currentTime = Date.now();
    const elapsed = currentTime - stage.startTime;

    if (elapsed <= 0) {
      return undefined;
    }

    // Simple linear extrapolation
    const totalEstimatedTime = elapsed / (stage.progress / 100);
    const remainingTime = totalEstimatedTime * (1 - stage.progress / 100);

    return Math.round(remainingTime);
  }

  /**
   * Smooth progress updates to prevent jumpy UI
   */
  smoothProgress(currentProgress: number, newProgress: number): number {
    // Exponential moving average for smoother updates
    return Math.round(currentProgress + (newProgress - currentProgress) * this.smoothingFactor);
  }

  /**
   * Add historical data point for better ETA calculations
   */
  addHistoricalData(progress: ProgressUpdate): void {
    this.historicalData.push(progress);

    // Keep only the last 20 data points
    if (this.historicalData.length > 20) {
      this.historicalData = this.historicalData.slice(-20);
    }
  }

  /**
   * Get average processing time from historical data
   */
  getAverageProcessingTime(stage: string): number {
    const stageData = this.historicalData.filter(p =>
      p.currentStage === stage && p.processingTime
    );

    if (stageData.length === 0) {
      return 0;
    }

    const totalTime = stageData.reduce((sum, p) => sum + (p.processingTime || 0), 0);
    return Math.round(totalTime / stageData.length);
  }
}
