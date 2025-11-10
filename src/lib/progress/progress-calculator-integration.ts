/**
 * Progress Calculator Integration Module
 *
 * Integrates the advanced ProgressCalculator with the existing ProgressTracker
 * system to provide enhanced progress tracking capabilities.
 */

import { ProgressCalculator, type ProgressCalculationOptions, type ETAPrediction, type PerformanceMetrics } from './progress-calculator';
import {
  ProgressTracker,
  type ProgressStage,
  type ProgressTrackerEntity,
  type ProgressUpdateOptions,
  type ProgressDeviceInfo
} from '../db/progress-tracker';
import type { DeviceInfo } from '@/types/mobile';

/**
 * Enhanced Progress Tracker with integrated calculator
 */
export class EnhancedProgressTracker extends ProgressTracker {
  private calculator: ProgressCalculator;
  private lastCalculationTime = 0;
  private lastPerformanceMetrics: PerformanceMetrics | null = null;
  private lastETAPrediction: ETAPrediction | null = null;

  constructor(options: any) {
    super(options);

    // Configure calculator based on device type and preferences
    const calculatorOptions = this.configureCalculator(options);
    this.calculator = new ProgressCalculator(calculatorOptions);
  }

  /**
   * Enhanced progress update with advanced calculations
   */
  async updateProgressEnhanced(options: ProgressUpdateOptions & {
    enableSmoothing?: boolean;
    enableAnomalyDetection?: boolean;
    calculatePerformance?: boolean;
    calculateETA?: boolean;
  }): Promise<{
    success: boolean;
    progress: ProgressUpdate;
    smoothed: boolean;
    anomaly?: any;
    performance?: PerformanceMetrics;
    eta?: ETAPrediction;
  }> {
    try {
      const entity = this.getEntity();
      const stages = entity.stages;

      // Get previous stages for anomaly detection
      const previousStages = { ...stages };

      // Update progress using base method
      await super.updateProgress(options);

      // Get updated stages
      const updatedEntity = this.getEntity();
      const updatedStages = updatedEntity.stages;

      let smoothedStages = updatedStages;
      let smoothed = false;

      // Apply smoothing if enabled
      if (options.enableSmoothing !== false) {
        smoothedStages = this.calculator.smoothProgress(updatedStages);
        smoothed = JSON.stringify(updatedStages) !== JSON.stringify(smoothedStages);

        if (smoothed) {
          // Update with smoothed values
          await super.updateProgress({
            stage: options.stage,
            progress: smoothedStages[options.stage].progress,
            skipHistory: true
          });
        }
      }

      // Validate and detect anomalies
      let anomaly: any = null;
      if (options.enableAnomalyDetection !== false) {
        const { validation, anomaly: detectedAnomaly } = this.calculator.validateAndDetectAnomalies(
          smoothedStages,
          previousStages
        );

        if (!validation.isValid || detectedAnomaly.hasAnomaly) {
          anomaly = { validation, anomaly: detectedAnomaly };

          // Apply corrections if validation failed
          if (validation.correctedValues) {
            const correctedStages = { ...smoothedStages, ...validation.correctedValues };
            await super.updateProgress({
              stage: options.stage,
              progress: correctedStages[options.stage].progress,
              skipHistory: true
            });
          }
        }
      }

      // Calculate performance metrics
      let performance: PerformanceMetrics | undefined;
      if (options.calculatePerformance !== false) {
        performance = this.calculator.calculatePerformanceMetrics(smoothedStages);
        this.lastPerformanceMetrics = performance;
      }

      // Calculate ETA
      let eta: ETAPrediction | undefined;
      if (options.calculateETA !== false) {
        const currentStage = options.stage as keyof ProgressStage;
        eta = this.calculator.calculateETA(
          smoothedStages,
          currentStage,
          this.getDeviceInfo(),
          smoothedStages[currentStage].startTime
        );
        this.lastETAPrediction = eta;
      }

      // Add historical data point
      this.calculator.addHistoricalData({
        stage: options.stage,
        duration: Date.now() - this.lastCalculationTime,
        size: smoothedStages.upload.totalBytes || 0,
        chunks: smoothedStages.transcription.totalChunks,
        segments: smoothedStages['post-processing'].totalSegments,
        deviceType: this.getDeviceInfo()?.type || 'desktop',
        networkType: this.getDeviceInfo()?.networkType || 'unknown'
      });

      this.lastCalculationTime = Date.now();

      const progress = this.getCurrentProgress();

      return {
        success: true,
        progress,
        smoothed,
        anomaly,
        performance,
        eta
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.lastPerformanceMetrics;
  }

  /**
   * Get current ETA prediction
   */
  getETAPrediction(): ETAPrediction | null {
    return this.lastETAPrediction;
  }

  /**
   * Get mobile optimizations from calculator
   */
  getCalculatorMobileOptimizations() {
    const deviceInfo = this.getDeviceInfo();
    return this.calculator.getMobileOptimizations(
      deviceInfo,
      deviceInfo?.batteryLevel
    );
  }

  /**
   * Get enhanced progress with all calculated data
   */
  getEnhancedProgress(): ProgressUpdate & {
    performance?: PerformanceMetrics;
    eta?: ETAPrediction;
    mobileOptimizations?: any;
    anomaly?: any;
  } {
    const baseProgress = this.getCurrentProgress();

    return {
      ...baseProgress,
      performance: this.lastPerformanceMetrics || undefined,
      eta: this.lastETAPrediction || undefined,
      mobileOptimizations: this.getCalculatorMobileOptimizations(),
      anomaly: undefined // Would be populated during last update
    };
  }

  private configureCalculator(options: any): ProgressCalculationOptions {
    const deviceInfo = options.deviceInfo;
    const isMobile = deviceInfo?.type === 'mobile' || deviceInfo?.type === 'tablet';

    return {
      smoothing: {
        enabled: true,
        factor: isMobile ? 0.4 : 0.3, // More smoothing for mobile
        windowSize: isMobile ? 3 : 5, // Smaller window for mobile
        outlierThreshold: 2.0,
        minUpdateInterval: isMobile ? 2000 : 1000,
        maxJumpSize: isMobile ? 10 : 15
      },
      mobileOptimization: {
        enabled: true,
        reducedFrequency: isMobile,
        batteryAware: isMobile,
        networkAdaptive: true,
        lowPowerThreshold: 0.2,
        updateIntervalMultiplier: isMobile ? 2 : 1,
        calculationComplexity: isMobile ? 'standard' : 'full'
      },
      enableHistoricalETA: true,
      enableAnomalyDetection: !isMobile, // Disable for very low-end devices
      maxHistorySize: isMobile ? 50 : 100,
      performanceWindow: 10
    };
  }

  private getDeviceInfo(): Partial<DeviceInfo> | undefined {
    const entity = this.getEntity();
    return entity.deviceInfo ? {
      type: entity.deviceInfo.type as 'mobile' | 'tablet' | 'desktop',
      screenSize: { width: 0, height: 0 }, // Not available in ProgressDeviceInfo
      userAgent: navigator.userAgent,
      touchPoints: entity.deviceInfo.type === 'mobile' ? 1 : 0,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    } : undefined;
  }
}

/**
 * Factory function to create enhanced progress trackers
 */
export async function createEnhancedProgressTracker(options: any): Promise<EnhancedProgressTracker> {
  const tracker = new EnhancedProgressTracker(options);
  await tracker.saveToDatabase(); // Save initial state
  return tracker;
}

/**
 * Hook for using enhanced progress tracker with React
 */
export function useEnhancedProgressTracker(fileId: number, options: {
  enableSmoothing?: boolean;
  enableAnomalyDetection?: boolean;
  enablePerformanceMetrics?: boolean;
  enableETA?: boolean;
  updateInterval?: number;
} = {}) {
  // This would need to be implemented in the progress-utils.ts file
  // For now, this is a placeholder showing the interface

  return {
    tracker: null as EnhancedProgressTracker | null,
    progress: null as any,
    performance: null as PerformanceMetrics | null,
    eta: null as ETAPrediction | null,
    isLoading: false,
    error: null as Error | null,
    updateProgress: async (stage: any, progress: number, message?: string) => {
      // Implementation would go here
    }
  };
}

/**
 * Progress calculation utilities for integration
 */
export class ProgressCalculationUtils {
  /**
   * Convert ProgressUpdate to calculator-compatible format
   */
  static progressUpdateToStage(progress: any): ProgressStage {
    return {
      upload: {
        progress: progress.stages?.upload?.progress || 0,
        bytesTransferred: progress.stages?.upload?.bytesTransferred || 0,
        totalBytes: progress.stages?.upload?.totalBytes || 0,
        speed: progress.stages?.upload?.speed || 0,
        eta: progress.stages?.upload?.eta,
        lastUpdate: new Date()
      },
      transcription: {
        progress: progress.stages?.transcription?.progress || 0,
        currentChunk: progress.stages?.transcription?.currentChunk || 0,
        totalChunks: progress.stages?.transcription?.totalChunks || 0,
        averageChunkTime: 0, // Not available in ProgressUpdate
        eta: progress.stages?.transcription?.eta,
        lastUpdate: new Date()
      },
      'post-processing': {
        progress: progress.stages?.['post-processing']?.progress || 0,
        segmentsProcessed: progress.stages?.['post-processing']?.segmentsProcessed || 0,
        totalSegments: progress.stages?.['post-processing']?.totalSegments || 0,
        currentOperation: progress.stages?.['post-processing']?.currentOperation || 'normalization',
        lastUpdate: new Date()
      }
    };
  }

  /**
   * Merge calculator results with ProgressUpdate
   */
  static mergeCalculationResults(
    baseProgress: any,
    performance?: PerformanceMetrics,
    eta?: ETAPrediction,
    anomaly?: any
  ): any {
    return {
      ...baseProgress,
      // Enhanced ETA information
      enhancedETA: eta ? {
        estimated: eta.estimatedTimeRemaining,
        confidence: eta.confidence,
        range: `${eta.minEstimate}s - ${eta.maxEstimate}s`,
        historical: eta.historicalAverage,
        current: eta.currentPerformance
      } : undefined,
      // Performance metrics
      performance: performance ? {
        overallVelocity: performance.overallVelocity,
        accuracy: performance.accuracy,
        consistency: performance.consistency,
        speeds: {
          upload: performance.uploadSpeed,
          transcription: performance.transcriptionSpeed,
          processing: performance.processingSpeed
        }
      } : undefined,
      // Anomaly information
      anomaly: anomaly?.anomaly?.hasAnomaly ? {
        type: anomaly.anomaly.anomalyType,
        severity: anomaly.anomaly.severity,
        description: anomaly.anomaly.description,
        suggestedAction: anomaly.anomaly.suggestedAction
      } : undefined
    };
  }

  /**
   * Determine optimal update frequency based on device and network conditions
   */
  static getOptimalUpdateFrequency(deviceInfo?: Partial<DeviceInfo>): {
    interval: number;
    enableSmoothing: boolean;
    enablePerformanceMetrics: boolean;
    enableAnomalyDetection: boolean;
  } {
    const isMobile = deviceInfo?.type === 'mobile' || deviceInfo?.type === 'tablet';
    const isCellular = deviceInfo?.networkType === 'cellular';
    const isLowBattery = deviceInfo?.batteryLevel ? deviceInfo.batteryLevel < 0.2 : false;

    let interval = 1000; // Default: 1 second
    let enableSmoothing = true;
    let enablePerformanceMetrics = true;
    let enableAnomalyDetection = true;

    if (isMobile) {
      interval = 2000; // 2 seconds for mobile
      enablePerformanceMetrics = !isLowBattery;
    }

    if (isCellular) {
      interval *= 1.5; // 50% slower on cellular
    }

    if (isLowBattery) {
      interval *= 2; // Double the interval on low battery
      enableAnomalyDetection = false; // Disable anomaly detection to save battery
      enableSmoothing = false; // Reduce calculations
    }

    return {
      interval: Math.round(interval),
      enableSmoothing,
      enablePerformanceMetrics,
      enableAnomalyDetection
    };
  }
}

/**
 * Migration utilities for upgrading existing ProgressTrackers
 */
export class ProgressTrackerMigration {
  /**
   * Upgrade existing ProgressTracker to EnhancedProgressTracker
   */
  static async upgradeTracker(trackerId: string): Promise<EnhancedProgressTracker> {
    try {
      // Load existing tracker
      const existingTracker = await trackerId; // This would need actual implementation

      // Create enhanced version with same data
      const entity = existingTracker.getEntity();
      const enhancedTracker = await createEnhancedProgressTracker({
        jobId: entity.jobId,
        fileId: entity.fileId,
        connectionType: entity.connectionType,
        deviceInfo: entity.deviceInfo,
        initialStage: entity.currentStage,
        message: entity.currentMessage
      });

      // Copy progress data
      await enhancedTracker.updateProgress({
        stage: 'upload',
        progress: entity.stages.upload.progress,
        metadata: {
          bytesTransferred: entity.stages.upload.bytesTransferred,
          totalBytes: entity.stages.upload.totalBytes
        },
        skipHistory: true
      });

      await enhancedTracker.updateProgress({
        stage: 'transcription',
        progress: entity.stages.transcription.progress,
        metadata: {
          currentChunk: entity.stages.transcription.currentChunk,
          totalChunks: entity.stages.transcription.totalChunks
        },
        skipHistory: true
      });

      await enhancedTracker.updateProgress({
        stage: 'post-processing',
        progress: entity.stages['post-processing'].progress,
        metadata: {
          segmentsProcessed: entity.stages['post-processing'].segmentsProcessed,
          totalSegments: entity.stages['post-processing'].totalSegments,
          currentOperation: entity.stages['post-processing'].currentOperation
        },
        skipHistory: true
      });

      // Clean up old tracker
      await existingTracker.destroy();
      // Note: Would need actual cleanup implementation

      return enhancedTracker;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch upgrade all existing trackers
   */
  static async upgradeAllTrackers(): Promise<{ success: number; failed: number }> {
    // This would need implementation to list all trackers
    const trackerIds: string[] = []; // Get from database

    let success = 0;
    let failed = 0;

    for (const trackerId of trackerIds) {
      try {
        await this.upgradeTracker(trackerId);
        success++;
      } catch (error) {
        console.error(`Failed to upgrade tracker ${trackerId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }
}
