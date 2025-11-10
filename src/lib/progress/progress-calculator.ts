/**
 * Multi-Stage Progress Calculator Utilities
 *
 * Advanced progress calculation system for transcription pipeline with:
 * - Weighted stage calculations (upload: 10%, transcription: 75%, post-processing: 15%)
 * - ETA predictions with historical data analysis
 * - Performance metrics and anomaly detection
 * - Mobile-optimized calculations with battery awareness
 * - Progress smoothing and validation
 */

import type { ProgressStage, ProgressUpdate } from "../db/progress-tracker";
import type { DeviceInfo, MobilePerformanceMetrics } from "@/types/mobile";
import { handleError } from "../utils/error-handler";

// Stage weights for progress calculation
export const STAGE_WEIGHTS = {
  upload: 0.1, // 10% of total progress
  transcription: 0.75, // 75% of total progress
  "post-processing": 0.15, // 15% of total progress
} as const;

// Performance metrics interface
export interface PerformanceMetrics {
  // Speed metrics
  uploadSpeed: number; // bytes per second
  transcriptionSpeed: number; // chunks per minute
  processingSpeed: number; // segments per minute

  // Throughput metrics
  averageChunkTime: number; // milliseconds per chunk
  averageSegmentTime: number; // milliseconds per segment
  wordsPerMinute: number; // transcription speed

  // Progress velocity
  overallVelocity: number; // overall progress % per minute
  stageVelocity: Record<string, number>; // per-stage velocity

  // Quality metrics
  accuracy: number; // prediction accuracy (0-1)
  consistency: number; // progress consistency (0-1)
  stability: number; // measurement stability (0-1)
}

// ETA prediction interface
export interface ETAPrediction {
  estimatedTimeRemaining: number; // seconds
  confidence: number; // 0-1 confidence level
  minEstimate: number; // best case
  maxEstimate: number; // worst case
  historicalAverage: number; // based on historical data
  currentPerformance: number; // based on current performance
}

// Progress smoothing configuration
export interface SmoothingConfig {
  enabled: boolean;
  factor: number; // 0-1, higher = more smoothing
  windowSize: number; // number of data points for moving average
  outlierThreshold: number; // threshold for outlier detection
  minUpdateInterval: number; // milliseconds between updates
  maxJumpSize: number; // maximum progress jump percentage
}

// Mobile optimization configuration
export interface MobileOptimization {
  enabled: boolean;
  reducedFrequency: boolean;
  batteryAware: boolean;
  networkAdaptive: boolean;
  lowPowerThreshold: number; // battery level threshold
  updateIntervalMultiplier: number; // multiplier for update intervals
  calculationComplexity: "minimal" | "standard" | "full";
}

// Historical data point for ETA calculations
export interface HistoricalDataPoint {
  stage: string;
  duration: number; // milliseconds
  size: number; // file size in bytes
  chunks?: number; // number of chunks processed
  segments?: number; // number of segments processed
  timestamp: number; // when recorded
  deviceType: string; // mobile/desktop/tablet
  networkType: string; // wifi/cellular
}

// Progress calculation options
export interface ProgressCalculationOptions {
  smoothing?: SmoothingConfig;
  mobileOptimization?: MobileOptimization;
  enableHistoricalETA?: boolean;
  enableAnomalyDetection?: boolean;
  maxHistorySize?: number;
  performanceWindow?: number; // minutes for performance calculation
}

// Progress validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedValues?: Partial<ProgressStage>;
}

// Anomaly detection result
export interface AnomalyDetection {
  hasAnomaly: boolean;
  anomalyType: "stall" | "jump" | "regression" | "inconsistent" | "none";
  severity: "low" | "medium" | "high";
  description: string;
  suggestedAction: string;
  correctedProgress?: number;
}

/**
 * Advanced Multi-Stage Progress Calculator
 */
export class ProgressCalculator {
  private historicalData: HistoricalDataPoint[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private lastUpdateTime: number = 0;
  private smoothedProgress: Record<string, number> = {};
  private updateHistory: Array<{
    timestamp: number;
    progress: Record<string, number>;
  }> = [];

  private readonly options: Required<ProgressCalculationOptions>;

  constructor(options: ProgressCalculationOptions = {}) {
    this.options = {
      smoothing: {
        enabled: true,
        factor: 0.3,
        windowSize: 5,
        outlierThreshold: 2.0, // standard deviations
        minUpdateInterval: 1000,
        maxJumpSize: 15,
        ...options.smoothing,
      },
      mobileOptimization: {
        enabled: true,
        reducedFrequency: true,
        batteryAware: true,
        networkAdaptive: true,
        lowPowerThreshold: 0.2,
        updateIntervalMultiplier: 2,
        calculationComplexity: "standard",
        ...options.mobileOptimization,
      },
      enableHistoricalETA: true,
      enableAnomalyDetection: true,
      maxHistorySize: 100,
      performanceWindow: 10,
      ...options,
    };

    // Initialize smoothed progress
    this.smoothedProgress = {
      upload: 0,
      transcription: 0,
      "post-processing": 0,
    };
  }

  /**
   * Calculate overall weighted progress from individual stages
   */
  calculateOverallProgress(stages: ProgressStage): number {
    let totalProgress = 0;
    let totalWeight = 0;

    for (const [stageName, stageData] of Object.entries(STAGE_WEIGHTS)) {
      const stageKey = stageName as keyof typeof STAGE_WEIGHTS;
      const progress = stages[stageKey]?.progress || 0;

      totalProgress += progress * stageData;
      totalWeight += stageData;
    }

    return Math.round(Math.min(100, Math.max(0, totalProgress)));
  }

  /**
   * Calculate ETA with multiple prediction methods
   */
  calculateETA(
    stages: ProgressStage,
    currentStage: keyof ProgressStage,
    deviceInfo?: Partial<DeviceInfo>,
    startTime?: Date,
  ): ETAPrediction | null {
    const stageData = stages[currentStage];
    if (!stageData || stageData.progress <= 0) {
      return null;
    }

    const predictions: number[] = [];
    let confidence = 0.5;

    // Current performance prediction
    const currentETA = this.calculateCurrentPerformanceETA(
      stageData,
      currentStage,
    );
    if (currentETA > 0) {
      predictions.push(currentETA);
      confidence += 0.2;
    }

    // Historical average prediction
    if (this.options.enableHistoricalETA) {
      const historicalETA = this.calculateHistoricalETA(
        currentStage,
        stageData.progress,
        deviceInfo,
      );
      if (historicalETA > 0) {
        predictions.push(historicalETA);
        confidence += 0.2;
      }
    }

    // Linear extrapolation prediction
    if (startTime) {
      const linearETA = this.calculateLinearETA(stageData, startTime);
      if (linearETA > 0) {
        predictions.push(linearETA);
        confidence += 0.1;
      }
    }

    if (predictions.length === 0) {
      return null;
    }

    // Calculate weighted average
    const weights = [0.5, 0.3, 0.2]; // Current, Historical, Linear
    let weightedSum = 0;
    let totalWeight = 0;

    predictions.forEach((prediction, index) => {
      const weight = weights[index] || 0.1;
      weightedSum += prediction * weight;
      totalWeight += weight;
    });

    const estimatedTimeRemaining = weightedSum / totalWeight;
    confidence = Math.min(0.95, confidence);

    return {
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
      confidence,
      minEstimate: Math.round(estimatedTimeRemaining * 0.7),
      maxEstimate: Math.round(estimatedTimeRemaining * 1.5),
      historicalAverage: predictions[1] || estimatedTimeRemaining,
      currentPerformance: predictions[0] || estimatedTimeRemaining,
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(
    stages: ProgressStage,
    updateTime: Date = new Date(),
  ): PerformanceMetrics {
    const now = updateTime.getTime();

    // Calculate stage-specific speeds
    const uploadSpeed = this.calculateUploadSpeed(stages.upload);
    const transcriptionSpeed = this.calculateTranscriptionSpeed(
      stages.transcription,
    );
    const processingSpeed = this.calculateProcessingSpeed(
      stages["post-processing"],
    );

    // Calculate average times
    const averageChunkTime = stages.transcription.averageChunkTime || 0;
    const averageSegmentTime = this.calculateAverageSegmentTime(
      stages["post-processing"],
    );

    // Calculate overall velocity
    const overallVelocity = this.calculateOverallVelocity(stages, now);
    const stageVelocity = this.calculateStageVelocities(stages, now);

    // Calculate quality metrics
    const accuracy = this.calculateAccuracy();
    const consistency = this.calculateConsistency();
    const stability = this.calculateStability();

    const metrics: PerformanceMetrics = {
      uploadSpeed,
      transcriptionSpeed,
      processingSpeed,
      averageChunkTime,
      averageSegmentTime,
      wordsPerMinute: this.calculateWordsPerMinute(stages.transcription),
      overallVelocity,
      stageVelocity,
      accuracy,
      consistency,
      stability,
    };

    // Store in history for trend analysis
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > this.options.maxHistorySize) {
      this.performanceHistory.shift();
    }

    return metrics;
  }

  /**
   * Smooth progress updates to prevent jarring UI changes
   */
  smoothProgress(
    stages: ProgressStage,
    forceUpdate: boolean = false,
  ): ProgressStage {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

    // Check if we should skip the update for mobile optimization
    if (!forceUpdate && this.shouldSkipUpdate(timeSinceLastUpdate)) {
      return stages;
    }

    const smoothedStages = { ...stages };

    for (const [stageName, stageData] of Object.entries(stages)) {
      const currentProgress = stageData.progress;
      const smoothedProgress = this.smoothedProgress[stageName];

      if (this.options.smoothing.enabled && smoothedProgress !== undefined) {
        // Check for anomalous jumps
        const jumpSize = Math.abs(currentProgress - smoothedProgress);
        if (jumpSize > this.options.smoothing.maxJumpSize) {
          // Apply more aggressive smoothing for large jumps
          const aggressiveFactor = this.options.smoothing.factor * 0.5;
          smoothedStages[stageName as keyof ProgressStage] = {
            ...stageData,
            progress: Math.round(
              smoothedProgress +
                (currentProgress - smoothedProgress) * aggressiveFactor,
            ),
          };
        } else {
          // Apply normal smoothing
          smoothedStages[stageName as keyof ProgressStage] = {
            ...stageData,
            progress: Math.round(
              smoothedProgress +
                (currentProgress - smoothedProgress) *
                  this.options.smoothing.factor,
            ),
          };
        }
      }

      // Update stored smoothed progress
      this.smoothedProgress[stageName] =
        smoothedStages[stageName as keyof ProgressStage].progress;
    }

    this.lastUpdateTime = currentTime;
    this.updateHistory.push({
      timestamp: currentTime,
      progress: {
        upload: smoothedStages.upload.progress,
        transcription: smoothedStages.transcription.progress,
        "post-processing": smoothedStages["post-processing"].progress,
      },
    });

    // Limit history size
    if (this.updateHistory.length > this.options.smoothing.windowSize) {
      this.updateHistory.shift();
    }

    return smoothedStages;
  }

  /**
   * Validate progress data and detect anomalies
   */
  validateAndDetectAnomalies(
    stages: ProgressStage,
    previousStages?: ProgressStage,
  ): { validation: ValidationResult; anomaly: AnomalyDetection } {
    const validation = this.validateProgress(stages);
    const anomaly =
      this.options.enableAnomalyDetection && previousStages
        ? this.detectAnomalies(stages, previousStages)
        : {
            hasAnomaly: false,
            anomalyType: "none" as const,
            severity: "low" as const,
            description: "",
            suggestedAction: "",
          };

    return { validation, anomaly };
  }

  /**
   * Add historical data point for better predictions
   */
  addHistoricalData(data: Omit<HistoricalDataPoint, "timestamp">): void {
    const dataPoint: HistoricalDataPoint = {
      ...data,
      timestamp: Date.now(),
    };

    this.historicalData.push(dataPoint);

    // Limit history size
    if (this.historicalData.length > this.options.maxHistorySize) {
      this.historicalData.shift();
    }
  }

  /**
   * Get mobile-specific optimizations
   */
  getMobileOptimizations(
    deviceInfo?: Partial<DeviceInfo>,
    batteryLevel?: number,
  ): {
    shouldReduceFrequency: boolean;
    shouldSimplifyCalculations: boolean;
    updateInterval: number;
    calculationComplexity: "minimal" | "standard" | "full";
  } {
    if (!this.options.mobileOptimization.enabled || !deviceInfo) {
      return {
        shouldReduceFrequency: false,
        shouldSimplifyCalculations: false,
        updateInterval: this.options.smoothing.minUpdateInterval,
        calculationComplexity: "full",
      };
    }

    const isMobile =
      deviceInfo.type === "mobile" || deviceInfo.type === "tablet";
    const isLowBattery =
      batteryLevel !== undefined &&
      batteryLevel < this.options.mobileOptimization.lowPowerThreshold;
    const isLowPowerMode = deviceInfo.isLowPowerMode || false;
    const isCellular = deviceInfo.networkType === "cellular";

    let shouldReduceFrequency = false;
    let shouldSimplifyCalculations = false;
    let calculationComplexity: "minimal" | "standard" | "full" = "full";
    let updateInterval = this.options.smoothing.minUpdateInterval;

    if (isMobile) {
      shouldReduceFrequency = this.options.mobileOptimization.reducedFrequency;
      calculationComplexity =
        this.options.mobileOptimization.calculationComplexity;

      if (isLowBattery || isLowPowerMode) {
        shouldSimplifyCalculations =
          this.options.mobileOptimization.batteryAware;
        updateInterval *=
          this.options.mobileOptimization.updateIntervalMultiplier;
        calculationComplexity =
          calculationComplexity === "full" ? "standard" : calculationComplexity;
      }

      if (isCellular && this.options.mobileOptimization.networkAdaptive) {
        shouldReduceFrequency = true;
        updateInterval *= 1.5;
      }
    }

    return {
      shouldReduceFrequency,
      shouldSimplifyCalculations,
      updateInterval: Math.round(updateInterval),
      calculationComplexity,
    };
  }

  // Private helper methods

  private shouldSkipUpdate(timeSinceLastUpdate: number): boolean {
    const mobileOpts = this.getMobileOptimizations();
    return (
      mobileOpts.shouldReduceFrequency &&
      timeSinceLastUpdate < mobileOpts.updateInterval
    );
  }

  private calculateCurrentPerformanceETA(
    stageData: any,
    stageName: string,
  ): number {
    if (stageData.progress <= 0 || !stageData.startTime) {
      return 0;
    }

    const elapsed = Date.now() - stageData.startTime.getTime();
    const progressRate = stageData.progress / elapsed; // progress per millisecond

    if (progressRate <= 0) {
      return 0;
    }

    const remainingProgress = 100 - stageData.progress;
    return remainingProgress / progressRate / 1000; // Convert to seconds
  }

  private calculateHistoricalETA(
    stageName: string,
    currentProgress: number,
    deviceInfo?: Partial<DeviceInfo>,
  ): number {
    const relevantHistory = this.historicalData.filter(
      (data) =>
        data.stage === stageName &&
        (!deviceInfo || data.deviceType === deviceInfo.type),
    );

    if (relevantHistory.length === 0) {
      return 0;
    }

    // Calculate average duration and adjust for current progress
    const avgDuration =
      relevantHistory.reduce((sum, data) => sum + data.duration, 0) /
      relevantHistory.length;
    const estimatedTotalDuration = avgDuration / (currentProgress / 100);
    const remainingDuration =
      estimatedTotalDuration * (1 - currentProgress / 100);

    return remainingDuration / 1000; // Convert to seconds
  }

  private calculateLinearETA(stageData: any, startTime: Date): number {
    const elapsed = Date.now() - startTime.getTime();
    if (elapsed <= 0 || stageData.progress <= 0) {
      return 0;
    }

    const totalEstimatedTime = (elapsed / stageData.progress) * 100;
    const remainingTime = totalEstimatedTime * (1 - stageData.progress / 100);

    return remainingTime / 1000; // Convert to seconds
  }

  private calculateUploadSpeed(uploadStage: any): number {
    if (!uploadStage.startTime || uploadStage.bytesTransferred <= 0) {
      return 0;
    }

    const elapsed = Date.now() - uploadStage.startTime.getTime();
    return elapsed > 0 ? (uploadStage.bytesTransferred * 1000) / elapsed : 0;
  }

  private calculateTranscriptionSpeed(transcriptionStage: any): number {
    if (!transcriptionStage.startTime || transcriptionStage.currentChunk <= 0) {
      return 0;
    }

    const elapsed = Date.now() - transcriptionStage.startTime.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);

    return elapsedMinutes > 0
      ? transcriptionStage.currentChunk / elapsedMinutes
      : 0;
  }

  private calculateProcessingSpeed(postProcessingStage: any): number {
    if (
      !postProcessingStage.startTime ||
      postProcessingStage.segmentsProcessed <= 0
    ) {
      return 0;
    }

    const elapsed = Date.now() - postProcessingStage.startTime.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);

    return elapsedMinutes > 0
      ? postProcessingStage.segmentsProcessed / elapsedMinutes
      : 0;
  }

  private calculateAverageSegmentTime(postProcessingStage: any): number {
    if (
      postProcessingStage.segmentsProcessed <= 0 ||
      !postProcessingStage.startTime
    ) {
      return 0;
    }

    const elapsed = Date.now() - postProcessingStage.startTime.getTime();
    return elapsed / postProcessingStage.segmentsProcessed;
  }

  private calculateWordsPerMinute(transcriptionStage: any): number {
    // This would need actual word count data - implementing basic version
    return transcriptionStage.currentChunk * 50; // Rough estimate
  }

  private calculateOverallVelocity(
    stages: ProgressStage,
    currentTime: number,
  ): number {
    if (this.updateHistory.length < 2) {
      return 0;
    }

    const recent = this.updateHistory.slice(-2);
    const timeDiff = (recent[1].timestamp - recent[0].timestamp) / (1000 * 60); // minutes
    const overallProgressDiff =
      this.calculateOverallProgress(stages) -
      this.calculateOverallProgress({
        upload: { ...stages.upload, progress: recent[0].progress.upload },
        transcription: {
          ...stages.transcription,
          progress: recent[0].progress.transcription,
        },
        "post-processing": {
          ...stages["post-processing"],
          progress: recent[0].progress["post-processing"],
        },
      });

    return timeDiff > 0 ? overallProgressDiff / timeDiff : 0;
  }

  private calculateStageVelocities(
    stages: ProgressStage,
    currentTime: number,
  ): Record<string, number> {
    const velocities: Record<string, number> = {};

    if (this.updateHistory.length >= 2) {
      const recent = this.updateHistory.slice(-2);
      const timeDiff =
        (recent[1].timestamp - recent[0].timestamp) / (1000 * 60);

      for (const stage of Object.keys(stages)) {
        const stageKey = stage as keyof ProgressStage;
        // Access previous progress safely
        let previousProgress = 0;
        if (stageKey === "upload") previousProgress = recent[0].progress.upload;
        else if (stageKey === "transcription")
          previousProgress = recent[0].progress.transcription;
        else if (stageKey === "post-processing")
          previousProgress = recent[0].progress["post-processing"];

        const progressDiff = stages[stageKey].progress - previousProgress;
        velocities[stage] = timeDiff > 0 ? progressDiff / timeDiff : 0;
      }
    }

    return velocities;
  }

  private calculateAccuracy(): number {
    if (this.performanceHistory.length < 5) {
      return 0.5; // Default accuracy with insufficient data
    }

    // Calculate prediction accuracy based on historical performance
    const recent = this.performanceHistory.slice(-10);
    const avgVelocity =
      recent.reduce((sum, m) => sum + m.overallVelocity, 0) / recent.length;
    const variance =
      recent.reduce(
        (sum, m) => sum + Math.pow(m.overallVelocity - avgVelocity, 2),
        0,
      ) / recent.length;

    // Lower variance = higher accuracy
    return Math.max(
      0,
      Math.min(1, 1 - variance / (avgVelocity * avgVelocity + 1)),
    );
  }

  private calculateConsistency(): number {
    if (this.updateHistory.length < 3) {
      return 0.5;
    }

    const recent = this.updateHistory.slice(-5);
    const progressChanges: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      const overallPrev = this.calculateOverallProgress({
        upload: {
          progress: recent[i - 1].progress.upload,
          bytesTransferred: 0,
          totalBytes: 0,
          speed: 0,
          lastUpdate: new Date(),
        },
        transcription: {
          progress: recent[i - 1].progress.transcription,
          currentChunk: 0,
          totalChunks: 0,
          averageChunkTime: 0,
          lastUpdate: new Date(),
        },
        "post-processing": {
          progress: recent[i - 1].progress["post-processing"],
          segmentsProcessed: 0,
          totalSegments: 0,
          currentOperation: "normalization",
          lastUpdate: new Date(),
        },
      });
      const overallCurr = this.calculateOverallProgress({
        upload: {
          progress: recent[i].progress.upload,
          bytesTransferred: 0,
          totalBytes: 0,
          speed: 0,
          lastUpdate: new Date(),
        },
        transcription: {
          progress: recent[i].progress.transcription,
          currentChunk: 0,
          totalChunks: 0,
          averageChunkTime: 0,
          lastUpdate: new Date(),
        },
        "post-processing": {
          progress: recent[i].progress["post-processing"],
          segmentsProcessed: 0,
          totalSegments: 0,
          currentOperation: "normalization",
          lastUpdate: new Date(),
        },
      });
      progressChanges.push(overallCurr - overallPrev);
    }

    const avgChange =
      progressChanges.reduce((sum, change) => sum + change, 0) /
      progressChanges.length;
    const variance =
      progressChanges.reduce(
        (sum, change) => sum + Math.pow(change - avgChange, 2),
        0,
      ) / progressChanges.length;

    return Math.max(0, Math.min(1, 1 - variance / 25)); // Normalize by max expected variance
  }

  private calculateStability(): number {
    const accuracy = this.calculateAccuracy();
    const consistency = this.calculateConsistency();
    return (accuracy + consistency) / 2;
  }

  private validateProgress(stages: ProgressStage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const correctedValues: Partial<ProgressStage> = {};

    // Validate each stage
    for (const [stageName, stageData] of Object.entries(stages)) {
      // Check progress bounds
      if (stageData.progress < 0 || stageData.progress > 100) {
        errors.push(
          `Stage ${stageName} progress (${stageData.progress}) must be between 0 and 100`,
        );
        correctedValues[stageName as keyof ProgressStage] = {
          ...stageData,
          progress: Math.max(0, Math.min(100, stageData.progress)),
        };
      }

      // Check for logical inconsistencies
      if (stageName === "upload") {
        if (
          stageData.bytesTransferred > stageData.totalBytes &&
          stageData.totalBytes > 0
        ) {
          warnings.push(`Upload bytes transferred exceeds total bytes`);
          correctedValues.upload = {
            ...stageData,
            bytesTransferred: Math.min(
              stageData.bytesTransferred,
              stageData.totalBytes,
            ),
          };
        }
      }

      if (stageName === "transcription") {
        if (
          stageData.currentChunk > stageData.totalChunks &&
          stageData.totalChunks > 0
        ) {
          warnings.push(`Transcription current chunk exceeds total chunks`);
          correctedValues.transcription = {
            ...stageData,
            currentChunk: Math.min(
              stageData.currentChunk,
              stageData.totalChunks,
            ),
          };
        }
      }

      if (stageName === "post-processing") {
        if (
          stageData.segmentsProcessed > stageData.totalSegments &&
          stageData.totalSegments > 0
        ) {
          warnings.push(
            `Post-processing segments processed exceeds total segments`,
          );
          correctedValues["post-processing"] = {
            ...stageData,
            segmentsProcessed: Math.min(
              stageData.segmentsProcessed,
              stageData.totalSegments,
            ),
          };
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      correctedValues:
        Object.keys(correctedValues).length > 0 ? correctedValues : undefined,
    };
  }

  private detectAnomalies(
    currentStages: ProgressStage,
    previousStages: ProgressStage,
  ): AnomalyDetection {
    let hasAnomaly = false;
    let anomalyType: AnomalyDetection["anomalyType"] = "none";
    let severity: AnomalyDetection["severity"] = "low";
    let description = "";
    let suggestedAction = "";
    let correctedProgress: number | undefined;

    for (const stageName of Object.keys(currentStages) as Array<
      keyof ProgressStage
    >) {
      const currentProgress = currentStages[stageName].progress;
      const previousProgress = previousStages[stageName].progress;
      const progressDiff = currentProgress - previousProgress;

      // Check for regression
      if (progressDiff < -5) {
        hasAnomaly = true;
        anomalyType = "regression";
        severity = "high";
        description = `Progress regression detected in ${stageName} stage: ${previousProgress}% → ${currentProgress}%`;
        suggestedAction =
          "Restore previous progress state and investigate data consistency";
        correctedProgress = previousProgress;
        break;
      }

      // Check for unusual jump
      if (progressDiff > this.options.smoothing.maxJumpSize) {
        hasAnomaly = true;
        anomalyType = "jump";
        severity = "medium";
        description = `Unusual progress jump detected in ${stageName} stage: +${progressDiff}%`;
        suggestedAction =
          "Verify progress calculation accuracy and data integrity";
        correctedProgress = Math.min(
          previousProgress + this.options.smoothing.maxJumpSize,
          100,
        );
      }

      // Check for stall
      if (progressDiff === 0 && currentProgress < 100 && currentProgress > 0) {
        hasAnomaly = true;
        anomalyType = "stall";
        severity = "medium";
        description = `Progress stall detected in ${stageName} stage at ${currentProgress}%`;
        suggestedAction = "Check for processing errors or connection issues";
      }
    }

    // Check for inconsistent progress between stages
    const uploadProgress = currentStages.upload.progress;
    const transcriptionProgress = currentStages.transcription.progress;

    if (uploadProgress < 50 && transcriptionProgress > 20) {
      hasAnomaly = true;
      anomalyType = "inconsistent";
      severity = "medium";
      description =
        "Inconsistent stage progression: transcription starting before upload completion";
      suggestedAction = "Verify stage sequencing and data flow";
    }

    return {
      hasAnomaly,
      anomalyType: hasAnomaly ? anomalyType : "none",
      severity: hasAnomaly ? severity : "low",
      description,
      suggestedAction,
      correctedProgress,
    };
  }
}

/**
 * Factory function to create a configured progress calculator
 */
export function createProgressCalculator(
  options?: ProgressCalculationOptions,
): ProgressCalculator {
  return new ProgressCalculator(options);
}

/**
 * Utility function for quick progress calculations
 */
export function calculateQuickProgress(
  uploadProgress: number,
  transcriptionProgress: number,
  postProcessingProgress: number,
): number {
  const weights = STAGE_WEIGHTS;

  const totalProgress =
    uploadProgress * weights.upload +
    transcriptionProgress * weights.transcription +
    postProcessingProgress * weights["post-processing"];

  return Math.round(Math.min(100, Math.max(0, totalProgress)));
}

/**
 * Utility function for ETA formatting
 */
export function formatETA(etaSeconds: number): string {
  if (etaSeconds < 60) {
    return `${Math.round(etaSeconds)}s`;
  } else if (etaSeconds < 3600) {
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = Math.round(etaSeconds % 60);
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(etaSeconds / 3600);
    const minutes = Math.floor((etaSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Utility function for speed formatting
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}
