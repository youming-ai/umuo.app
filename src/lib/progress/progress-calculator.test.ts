/**
 * Progress Calculator Integration Test
 *
 * Basic test to verify the multi-stage progress calculator works correctly
 */

import {
  ProgressCalculator,
  createProgressCalculator,
  calculateQuickProgress,
  formatETA,
  formatSpeed
} from './progress-calculator';

// Test function
function testProgressCalculator() {
  console.log('Testing Progress Calculator...\n');

  // Test 1: Basic progress calculation
  console.log('1. Testing basic weighted progress calculation:');
  const calculator = createProgressCalculator();

  const stages = {
    upload: { progress: 100, bytesTransferred: 10000000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() },
    transcription: { progress: 50, currentChunk: 3, totalChunks: 6, averageChunkTime: 2000, lastUpdate: new Date() },
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  const overallProgress = calculator.calculateOverallProgress(stages);
  console.log(`   Upload: 100% (weight: 10%)`);
  console.log(`   Transcription: 50% (weight: 75%)`);
  console.log(`   Post-processing: 0% (weight: 15%)`);
  console.log(`   Overall Progress: ${overallProgress}%`);
  console.log(`   Expected: ~62.5% (100*0.1 + 50*0.75 + 0*0.15)\n`);

  // Test 2: Quick progress calculation utility
  console.log('2. Testing quick progress calculation:');
  const quickProgress = calculateQuickProgress(100, 50, 0);
  console.log(`   Quick calculation result: ${quickProgress}%\n`);

  // Test 3: ETA calculation
  console.log('3. Testing ETA calculation:');
  const eta = calculator.calculateETA(stages, 'transcription', { type: 'desktop' }, new Date(Date.now() - 30000));
  if (eta) {
    console.log(`   ETA: ${formatETA(eta.estimatedTimeRemaining)}`);
    console.log(`   Confidence: ${(eta.confidence * 100).toFixed(1)}%`);
    console.log(`   Range: ${formatETA(eta.minEstimate)} - ${formatETA(eta.maxEstimate)}`);
  } else {
    console.log('   ETA: Not enough data');
  }
  console.log();

  // Test 4: Performance metrics
  console.log('4. Testing performance metrics calculation:');
  const performance = calculator.calculatePerformanceMetrics(stages);
  console.log(`   Upload Speed: ${formatSpeed(performance.uploadSpeed)}`);
  console.log(`   Transcription Speed: ${performance.transcriptionSpeed.toFixed(1)} chunks/min`);
  console.log(`   Overall Velocity: ${performance.overallVelocity.toFixed(2)}%/min`);
  console.log(`   Accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);
  console.log(`   Consistency: ${(performance.consistency * 100).toFixed(1)}%`);
  console.log();

  // Test 5: Progress smoothing
  console.log('5. Testing progress smoothing:');
  const stagesWithJump = {
    upload: { progress: 100, bytesTransferred: 10000000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() },
    transcription: { progress: 80, currentChunk: 5, totalChunks: 6, averageChunkTime: 2000, lastUpdate: new Date() }, // Big jump
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  const smoothedStages = calculator.smoothProgress(stagesWithJump);
  console.log(`   Original transcription progress: ${stagesWithJump.transcription.progress}%`);
  console.log(`   Smoothed transcription progress: ${smoothedStages.transcription.progress}%`);
  console.log();

  // Test 6: Mobile optimizations
  console.log('6. Testing mobile optimizations:');
  const mobileDeviceInfo = { type: 'mobile' as const, networkType: 'cellular' as const, batteryLevel: 0.15 };
  const mobileOptions = calculator.getMobileOptimizations(mobileDeviceInfo, 0.15);
  console.log(`   Should reduce frequency: ${mobileOptions.shouldReduceFrequency}`);
  console.log(`   Should simplify calculations: ${mobileOptions.shouldSimplifyCalculations}`);
  console.log(`   Update interval: ${mobileOptions.updateInterval}ms`);
  console.log(`   Calculation complexity: ${mobileOptions.calculationComplexity}`);
  console.log();

  // Test 7: Progress validation
  console.log('7. Testing progress validation:');
  const invalidStages = {
    upload: { progress: 150, bytesTransferred: 15000000, totalBytes: 10000000, speed: 1024000, lastUpdate: new Date() }, // Invalid: > 100%
    transcription: { progress: 30, currentChunk: 2, totalChunks: 6, averageChunkTime: 2000, lastUpdate: new Date() },
    'post-processing': { progress: 0, segmentsProcessed: 0, totalSegments: 0, currentOperation: 'normalization', lastUpdate: new Date() }
  };

  const { validation, anomaly } = calculator.validateAndDetectAnomalies(invalidStages, stages);
  console.log(`   Validation passed: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   Warnings: ${validation.warnings.join(', ')}`);
  }
  console.log();

  console.log('Progress Calculator Test Complete! ✅');
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testProgressCalculator();
}

export { testProgressCalculator };
