/**
 * Advanced Progress Calculator Usage Examples
 *
 * Demonstrates how to use the new multi-stage progress calculation utilities
 * with enhanced features like ETA prediction, performance metrics, and mobile optimizations.
 */

import {
  ProgressCalculator,
  createProgressCalculator,
  calculateQuickProgress,
  formatETA,
  formatSpeed,
  type ProgressCalculationOptions,
  type ETAPrediction,
  type PerformanceMetrics,
  type MobileOptimization,
  type HistoricalDataPoint
} from './progress-calculator';

import {
  EnhancedProgressTracker,
  createEnhancedProgressTracker,
  ProgressCalculationUtils,
  ProgressTrackerMigration
} from './progress-calculator-integration';

import type { ProgressStage } from '../db/progress-tracker';
import type { DeviceInfo } from '@/types/mobile';

/**
 * Example 1: Basic Progress Calculator Usage
 */
export function basicProgressCalculatorExample() {
  console.log('=== Basic Progress Calculator Example ===');

  // Create calculator with default settings
  const calculator = createProgressCalculator();

  // Sample progress stages
  const stages: ProgressStage = {
    upload: {
      progress: 85,
      bytesTransferred: 8500000,
      totalBytes: 10000000,
      speed: 1024000, // 1MB/s
      lastUpdate: new Date()
    },
    transcription: {
      progress: 45,
      currentChunk: 3,
      totalChunks: 10,
      averageChunkTime: 2000, // 2 seconds per chunk
      lastUpdate: new Date()
    },
    'post-processing': {
      progress: 0,
      segmentsProcessed: 0,
      totalSegments: 0,
      currentOperation: 'normalization',
      lastUpdate: new Date()
    }
  };

  // Calculate overall weighted progress
  const overallProgress = calculator.calculateOverallProgress(stages);
  console.log(`Overall Progress: ${overallProgress}%`);

  // Calculate ETA for current stage
  const eta = calculator.calculateETA(stages, 'transcription');
  if (eta) {
    console.log(`ETA: ${formatETA(eta.estimatedTimeRemaining)}`);
    console.log(`Confidence: ${(eta.confidence * 100).toFixed(1)}%`);
    console.log(`Range: ${formatETA(eta.minEstimate)} - ${formatETA(eta.maxEstimate)}`);
  }

  // Calculate performance metrics
  const performance = calculator.calculatePerformanceMetrics(stages);
  console.log('Performance Metrics:');
  console.log(`  Upload Speed: ${formatSpeed(performance.uploadSpeed)}`);
  console.log(`  Transcription Speed: ${performance.transcriptionSpeed.toFixed(1)} chunks/min`);
  console.log(`  Overall Velocity: ${performance.overallVelocity.toFixed(2)}%/min`);
  console.log(`  Accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);
  console.log(`  Consistency: ${(performance.consistency * 100).toFixed(1)}%`);
}

/**
 * Example 2: Mobile-Optimized Progress Calculation
 */
export function mobileOptimizedExample() {
  console.log('\n=== Mobile-Optimized Example ===');

  // Mobile device info
  const mobileDevice: Partial<DeviceInfo> = {
    type: 'mobile',
    networkType: 'cellular',
    batteryLevel: 0.15, // Low battery
    isLowPowerMode: true
  };

  // Mobile-optimized configuration
  const mobileOptions: ProgressCalculationOptions = {
    smoothing: {
      enabled: true,
      factor: 0.4, // More smoothing for mobile
      windowSize: 3, // Smaller window
      minUpdateInterval: 2000, // Less frequent updates
      maxJumpSize: 10, // Smaller jumps allowed
      outlierThreshold: 1.5
    },
    mobileOptimization: {
      enabled: true,
      reducedFrequency: true,
      batteryAware: true,
      networkAdaptive: true,
      lowPowerThreshold: 0.2,
      updateIntervalMultiplier: 2,
      calculationComplexity: 'minimal' // Simplified calculations
    },
    enableHistoricalETA: false, // Disable to save battery
    enableAnomalyDetection: false, // Disable to save CPU
    maxHistorySize: 20, // Smaller history
    performanceWindow: 5 // Shorter window
  };

  const calculator = createProgressCalculator(mobileOptions);

  // Get mobile optimizations
  const optimizations = calculator.getMobileOptimizations(mobileDevice, mobileDevice.batteryLevel);
  console.log('Mobile Optimizations:');
  console.log(`  Reduce Frequency: ${optimizations.shouldReduceFrequency}`);
  console.log(`  Simplify Calculations: ${optimizations.shouldSimplifyCalculations}`);
  console.log(`  Update Interval: ${optimizations.updateInterval}ms`);
  console.log(`  Calculation Complexity: ${optimizations.calculationComplexity}`);
}

/**
 * Example 3: Enhanced Progress Tracker Integration
 */
export async function enhancedProgressTrackerExample() {
  console.log('\n=== Enhanced Progress Tracker Example ===');

  try {
    // Create enhanced tracker with mobile optimizations
    const tracker = await createEnhancedProgressTracker({
      jobId: 'enhanced_example_123',
      fileId: 456,
      connectionType: 'sse',
      deviceInfo: {
        type: 'tablet',
        networkType: 'wifi',
        batteryLevel: 0.7,
        isLowPowerMode: false
      },
      initialStage: 'upload',
      message: 'Starting enhanced progress tracking...'
    });

    // Simulate progress updates with enhanced features
    const updateResult = await tracker.updateProgressEnhanced({
      stage: 'upload',
      progress: 25,
      message: 'Uploading file...',
      enableSmoothing: true,
      enableAnomalyDetection: true,
      calculatePerformance: true,
      calculateETA: true,
      metadata: {
        bytesTransferred: 2500000,
        totalBytes: 10000000
      }
    });

    console.log('Enhanced Update Results:');
    console.log(`  Success: ${updateResult.success}`);
    console.log(`  Smoothed: ${updateResult.smoothed}`);
    console.log(`  Overall Progress: ${updateResult.progress.overallProgress}%`);

    if (updateResult.performance) {
      console.log('  Performance Metrics:');
      console.log(`    Upload Speed: ${formatSpeed(updateResult.performance.uploadSpeed)}`);
      console.log(`    Accuracy: ${(updateResult.performance.accuracy * 100).toFixed(1)}%`);
    }

    if (updateResult.eta) {
      console.log('  ETA Prediction:');
      console.log(`    Estimated: ${formatETA(updateResult.eta.estimatedTimeRemaining)}`);
      console.log(`    Confidence: ${(updateResult.eta.confidence * 100).toFixed(1)}%`);
    }

    if (updateResult.anomaly?.anomaly?.hasAnomaly) {
      console.log('  Anomaly Detected:');
      console.log(`    Type: ${updateResult.anomaly.anomaly.anomalyType}`);
      console.log(`    Severity: ${updateResult.anomaly.anomaly.severity}`);
    }

    // Get enhanced progress with all calculated data
    const enhancedProgress = tracker.getEnhancedProgress();
    console.log('\nEnhanced Progress Summary:');
    console.log(`  Current Stage: ${enhancedProgress.currentStage}`);
    console.log(`  Mobile Optimizations:`, enhancedProgress.mobileOptimizations);

    return tracker;
  } catch (error) {
    console.error('Enhanced tracker example failed:', error);
    throw error;
  }
}

/**
 * Example 4: Progress Anomaly Detection and Correction
 */
export function anomalyDetectionExample() {
  console.log('\n=== Anomaly Detection Example ===');

  const calculator = createProgressCalculator({
    enableAnomalyDetection: true,
    smoothing: {
      enabled: true,
      factor: 0.3,
      maxJumpSize: 15
    }
  });

  // Previous stages (normal)
  const previousStages: ProgressStage = {
    upload: { progress: 45, bytesTransferred: 4500000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() },
    transcription: { progress: 20, currentChunk: 2, totalChunks: 10, averageChunkTime: 2000, lastUpdate: new Date() },
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  // Current stages (with anomalies)
  const currentStages: ProgressStage = {
    upload: { progress: 75, bytesTransferred: 7500000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() }, // Normal jump
    transcription: { progress: 15, currentChunk: 1, totalChunks: 10, averageChunkTime: 2000, lastUpdate: new Date() }, // Regression
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  // Validate and detect anomalies
  const { validation, anomaly } = calculator.validateAndDetectAnomalies(currentStages, previousStages);

  console.log('Validation Results:');
  console.log(`  Valid: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log('  Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.log('  Warnings:', validation.warnings);
  }

  console.log('\nAnomaly Detection:');
  console.log(`  Has Anomaly: ${anomaly.hasAnomaly}`);
  if (anomaly.hasAnomaly) {
    console.log(`  Type: ${anomaly.anomalyType}`);
    console.log(`  Severity: ${anomaly.severity}`);
    console.log(`  Description: ${anomaly.description}`);
    console.log(`  Suggested Action: ${anomaly.suggestedAction}`);
    if (anomaly.correctedProgress !== undefined) {
      console.log(`  Corrected Progress: ${anomaly.correctedProgress}%`);
    }
  }

  // Apply smoothing to handle the anomaly
  const smoothedStages = calculator.smoothProgress(currentStages);
  console.log('\nAfter Smoothing:');
  console.log(`  Upload: ${previousStages.upload.progress}% → ${currentStages.upload.progress}% → ${smoothedStages.upload.progress}%`);
  console.log(`  Transcription: ${previousStages.transcription.progress}% → ${currentStages.transcription.progress}% → ${smoothedStages.transcription.progress}%`);
}

/**
 * Example 5: Historical Data Analysis and ETA Improvement
 */
export function historicalDataExample() {
  console.log('\n=== Historical Data Analysis Example ===');

  const calculator = createProgressCalculator({
    enableHistoricalETA: true,
    maxHistorySize: 50
  });

  // Simulate historical data from previous transcription jobs
  const historicalData: Omit<HistoricalDataPoint, 'timestamp'>[] = [
    { stage: 'upload', duration: 30000, size: 10000000, deviceType: 'desktop', networkType: 'wifi' },
    { stage: 'transcription', duration: 180000, chunks: 8, deviceType: 'desktop', networkType: 'wifi' },
    { stage: 'upload', duration: 45000, size: 15000000, deviceType: 'mobile', networkType: 'cellular' },
    { stage: 'transcription', duration: 240000, chunks: 12, deviceType: 'mobile', networkType: 'cellular' },
    { stage: 'post-processing', duration: 15000, segments: 50, deviceType: 'desktop', networkType: 'wifi' },
    { stage: 'post-processing', duration: 20000, segments: 60, deviceType: 'mobile', networkType: 'cellular' }
  ];

  // Add historical data to calculator
  historicalData.forEach(data => calculator.addHistoricalData(data));

  console.log(`Added ${historicalData.length} historical data points`);

  // Current progress stages
  const currentStages: ProgressStage = {
    upload: { progress: 100, bytesTransferred: 12000000, totalBytes: 12000000, speed: 2048000, lastUpdate: new Date() },
    transcription: { progress: 30, currentChunk: 2, totalChunks: 8, averageChunkTime: 22000, lastUpdate: new Date(Date.now() - 44000) },
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  // Calculate ETA with historical data
  const deviceInfo: Partial<DeviceInfo> = { type: 'desktop', networkType: 'wifi' };
  const eta = calculator.calculateETA(currentStages, 'transcription', deviceInfo);

  if (eta) {
    console.log('Enhanced ETA Calculation:');
    console.log(`  Current Performance: ${formatETA(eta.currentPerformance)}`);
    console.log(`  Historical Average: ${formatETA(eta.historicalAverage)}`);
    console.log(`  Final Estimate: ${formatETA(eta.estimatedTimeRemaining)}`);
    console.log(`  Confidence: ${(eta.confidence * 100).toFixed(1)}%`);
    console.log(`  Range: ${formatETA(eta.minEstimate)} - ${formatETA(eta.maxEstimate)}`);
  }
}

/**
 * Example 6: Migration from Basic to Enhanced Progress Tracking
 */
export async function migrationExample() {
  console.log('\n=== Progress Tracker Migration Example ===');

  try {
    // This would typically load existing trackers from the database
    const existingTrackerIds = ['tracker_1', 'tracker_2', 'tracker_3']; // Example IDs

    console.log(`Found ${existingTrackerIds.length} existing trackers to upgrade`);

    // Batch upgrade all trackers
    const migrationResults = await ProgressTrackerMigration.upgradeAllTrackers();

    console.log('Migration Results:');
    console.log(`  Successfully upgraded: ${migrationResults.success}`);
    console.log(`  Failed to upgrade: ${migrationResults.failed}`);

    // Example of upgrading a single tracker
    if (existingTrackerIds.length > 0) {
      console.log('\nUpgrading single tracker...');
      const enhancedTracker = await ProgressTrackerMigration.upgradeTracker(existingTrackerIds[0]);

      console.log('Single tracker upgrade successful');
      console.log(`  New tracker ID: ${enhancedTracker.getEntity().id}`);
      console.log(`  Current progress: ${enhancedTracker.getEntity().overallProgress}%`);
      console.log(`  Mobile optimizations available: ${Object.keys(enhancedTracker.getCalculatorMobileOptimizations()).length}`);
    }

  } catch (error) {
    console.error('Migration example failed:', error);
  }
}

/**
 * Example 7: Real-time Progress Monitoring Dashboard
 */
export function progressMonitoringExample() {
  console.log('\n=== Real-time Progress Monitoring Example ===');

  const calculator = createProgressCalculator({
    smoothing: {
      enabled: true,
      factor: 0.2,
      windowSize: 10,
      minUpdateInterval: 500
    },
    enableAnomalyDetection: true,
    enableHistoricalETA: true
  });

  // Simulate real-time progress updates
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 5 + 2; // Random progress increase

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      console.log('\nTranscription completed!');
      return;
    }

    const stages: ProgressStage = {
      upload: { progress: 100, bytesTransferred: 10000000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() },
      transcription: {
        progress: Math.min(progress, 85),
        currentChunk: Math.floor((progress / 85) * 10),
        totalChunks: 10,
        averageChunkTime: 2000,
        lastUpdate: new Date()
      },
      'post-processing': {
        progress: Math.max(0, progress - 85),
        segmentsProcessed: Math.floor(Math.max(0, progress - 85) / 15 * 50),
        totalSegments: 50,
        currentOperation: 'normalization',
        lastUpdate: new Date()
      }
    };

    // Calculate metrics
    const overallProgress = calculator.calculateOverallProgress(stages);
    const performance = calculator.calculatePerformanceMetrics(stages);
    const eta = calculator.calculateETA(stages, 'transcription');

    // Apply smoothing
    const smoothedStages = calculator.smoothProgress(stages);
    const smoothedProgress = calculator.calculateOverallProgress(smoothedStages);

    // Console output (simulating dashboard)
    console.clear();
    console.log('=== Real-time Progress Dashboard ===');
    console.log(`Overall Progress: ${smoothedProgress}% (raw: ${overallProgress}%)`);
    console.log(`Upload: 100% ✓`);
    console.log(`Transcription: ${stages.transcription.progress.toFixed(1)}%`);
    console.log(`Post-processing: ${stages['post-processing'].progress.toFixed(1)}%`);

    if (performance) {
      console.log('\nPerformance Metrics:');
      console.log(`  Velocity: ${performance.overallVelocity.toFixed(2)}%/min`);
      console.log(`  Consistency: ${(performance.consistency * 100).toFixed(1)}%`);
      console.log(`  Upload Speed: ${formatSpeed(performance.uploadSpeed)}`);
    }

    if (eta) {
      console.log('\nETA Information:');
      console.log(`  Estimated: ${formatETA(eta.estimatedTimeRemaining)}`);
      console.log(`  Confidence: ${(eta.confidence * 100).toFixed(1)}%`);
    }

  }, 1000); // Update every second
}

/**
 * Run all examples
 */
export async function runAllProgressCalculatorExamples() {
  console.log('Starting Progress Calculator Examples...\n');

  try {
    basicProgressCalculatorExample();
    mobileOptimizedExample();
    await enhancedProgressTrackerExample();
    anomalyDetectionExample();
    historicalDataExample();
    await migrationExample();

    console.log('\nAll examples completed successfully!');
    console.log('\nTo run the real-time monitoring example, call progressMonitoringExample()');

  } catch (error) {
    console.error('Examples failed:', error);
  }
}

// Export individual examples for selective testing
export const examples = {
  basic: basicProgressCalculatorExample,
  mobile: mobileOptimizedExample,
  enhanced: enhancedProgressTrackerExample,
  anomaly: anomalyDetectionExample,
  historical: historicalDataExample,
  migration: migrationExample,
  monitoring: progressMonitoringExample,
  all: runAllProgressCalculatorExamples
};
