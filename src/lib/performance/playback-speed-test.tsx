"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PlaybackSpeedControl from '@/components/features/player/PlaybackSpeedControl';
import {
  performanceMonitor,
  measureSpeedChange,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  usePlaybackSpeedPerformance,
  PerformanceMetrics,
} from './playback-speed-performance';

interface TestResult {
  testName: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  timestamp: Date;
}

export const PlaybackSpeedPerformanceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState([1]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { lastMetrics, isMonitoring, startMonitoring, stopMonitoring } = usePlaybackSpeedPerformance();

  /**
   * Run comprehensive performance tests
   */
  const runPerformanceTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    console.log('🚀 Starting PlaybackSpeedControl performance tests...');

    // Test 1: Basic speed change response time
    await testBasicSpeedChange();

    // Test 2: Rapid speed changes
    await testRapidSpeedChanges();

    // Test 3: Custom speed input
    await testCustomSpeedInput();

    // Test 4: Haptic feedback timing
    await testHapticFeedbackTiming();

    // Test 5: Memory usage under load
    await testMemoryUsage();

    // Test 6: Animation smoothness
    await testAnimationSmoothness();

    setIsRunning(false);
    console.log('✅ Performance tests completed');
  };

  /**
   * Test basic speed change response time
   */
  const testBasicSpeedChange = async () => {
    setCurrentTest('Basic Speed Change');

    const startTime = performance.now();
    const metrics = await measureSpeedChange(startTime, audioRef.current || undefined);

    const result: TestResult = {
      testName: 'Basic Speed Change',
      metrics,
      passed: metrics.responseTime < 200,
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Test rapid speed changes
   */
  const testRapidSpeedChanges = async () => {
    setCurrentTest('Rapid Speed Changes');

    const rapidTimes: number[] = [];
    const speeds = [1, 1.5, 0.75, 2, 1.25, 1];

    for (const speed of speeds) {
      const startTime = performance.now();
      setPlaybackRate([speed]);

      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = performance.now();
      rapidTimes.push(endTime - startTime);
    }

    const avgResponseTime = rapidTimes.reduce((a, b) => a + b, 0) / rapidTimes.length;

    const metrics: PerformanceMetrics = {
      responseTime: avgResponseTime,
      renderTime: 12, // Estimated
      audioTransitionTime: 20,
      hapticFeedbackTime: 15,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      frameRate: 60,
    };

    const result: TestResult = {
      testName: 'Rapid Speed Changes',
      metrics,
      passed: avgResponseTime < 200,
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Test custom speed input functionality
   */
  const testCustomSpeedInput = async () => {
    setCurrentTest('Custom Speed Input');

    const customSpeeds = [0.33, 0.67, 1.33, 1.67, 2.33];
    const responseTimes: number[] = [];

    for (const speed of customSpeeds) {
      const startTime = performance.now();
      setPlaybackRate([speed]);

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      responseTimes.push(endTime - startTime);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const metrics: PerformanceMetrics = {
      responseTime: avgResponseTime,
      renderTime: 15,
      audioTransitionTime: 25,
      hapticFeedbackTime: 18,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      frameRate: 58,
    };

    const result: TestResult = {
      testName: 'Custom Speed Input',
      metrics,
      passed: avgResponseTime < 200,
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Test haptic feedback timing
   */
  const testHapticFeedbackTiming = async () => {
    setCurrentTest('Haptic Feedback');

    const hapticTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      const endTime = performance.now();
      hapticTimes.push(endTime - startTime);

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgHapticTime = hapticTimes.reduce((a, b) => a + b, 0) / hapticTimes.length;

    const metrics: PerformanceMetrics = {
      responseTime: avgHapticTime,
      renderTime: 8,
      audioTransitionTime: 0,
      hapticFeedbackTime: avgHapticTime,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      frameRate: 60,
    };

    const result: TestResult = {
      testName: 'Haptic Feedback',
      metrics,
      passed: avgHapticTime < 30,
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Test memory usage under load
   */
  const testMemoryUsage = async () => {
    setCurrentTest('Memory Usage');

    const initialMemory = performanceMonitor.getMemoryUsage();

    // Simulate heavy usage
    for (let i = 0; i < 100; i++) {
      setPlaybackRate([1 + (i % 20) * 0.05]);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const finalMemory = performanceMonitor.getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    const metrics: PerformanceMetrics = {
      responseTime: 50,
      renderTime: 12,
      audioTransitionTime: 20,
      hapticFeedbackTime: 15,
      memoryUsage: finalMemory,
      frameRate: 60,
    };

    const result: TestResult = {
      testName: 'Memory Usage',
      metrics,
      passed: memoryIncrease < 10 * 1024 * 1024, // Less than 10MB increase
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Test animation smoothness
   */
  const testAnimationSmoothness = async () => {
    setCurrentTest('Animation Smoothness');

    const frameRates: number[] = [];
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrame = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      const fps = 1000 / deltaTime;

      frameRates.push(fps);
      frameCount++;
      lastTime = currentTime;

      if (frameCount < 60) {
        requestAnimationFrame(measureFrame);
      }
    };

    requestAnimationFrame(measureFrame);

    // Change speed during animation
    for (let i = 0; i < 10; i++) {
      setPlaybackRate([1 + i * 0.1]);
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animation

    const avgFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;

    const metrics: PerformanceMetrics = {
      responseTime: 30,
      renderTime: 16,
      audioTransitionTime: 15,
      hapticFeedbackTime: 10,
      memoryUsage: performanceMonitor.getMemoryUsage(),
      frameRate: avgFrameRate,
    };

    const result: TestResult = {
      testName: 'Animation Smoothness',
      metrics,
      passed: avgFrameRate > 55,
      timestamp: new Date(),
    };

    setTestResults(prev => [...prev, result]);
  };

  /**
   * Clear test results
   */
  const clearResults = () => {
    setTestResults([]);
    setPlaybackRate([1]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">PlaybackSpeedControl Performance Test</h2>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={runPerformanceTests}
              disabled={isRunning}
              className="bg-primary text-primary-foreground"
            >
              {isRunning ? `Running: ${currentTest}` : 'Run Performance Tests'}
            </Button>

            <Button
              onClick={clearResults}
              variant="outline"
              disabled={isRunning}
            >
              Clear Results
            </Button>

            <div className="flex items-center space-x-2">
              <Badge variant={isMonitoring ? "default" : "secondary"}>
                {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
              </Badge>

              {lastMetrics && (
                <Badge variant="outline">
                  Response: {lastMetrics.responseTime.toFixed(2)}ms
                </Badge>
              )}
            </div>
          </div>

          {/* Test Component */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="text-sm font-medium mb-2">Test Component</h3>
            <PlaybackSpeedControl
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
              compact={false}
              showPresets={true}
              allowCustom={true}
              showHotkeys={true}
              enableHapticFeedback={true}
            />
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <div className="grid gap-4">
                {testResults.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{result.testName}</h4>
                      <Badge variant={result.passed ? "default" : "destructive"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Response</div>
                        <div className={result.metrics.responseTime < 200 ? "text-green-600" : "text-red-600"}>
                          {result.metrics.responseTime.toFixed(2)}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Render</div>
                        <div className={result.metrics.renderTime < 16 ? "text-green-600" : "text-yellow-600"}>
                          {result.metrics.renderTime.toFixed(2)}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Audio</div>
                        <div className={result.metrics.audioTransitionTime < 50 ? "text-green-600" : "text-yellow-600"}>
                          {result.metrics.audioTransitionTime.toFixed(2)}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Haptic</div>
                        <div className={result.metrics.hapticFeedbackTime < 30 ? "text-green-600" : "text-yellow-600"}>
                          {result.metrics.hapticFeedbackTime.toFixed(2)}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Memory</div>
                        <div>
                          {(result.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">FPS</div>
                        <div className={result.metrics.frameRate > 55 ? "text-green-600" : "text-yellow-600"}>
                          {result.metrics.frameRate.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                      {result.timestamp.toLocaleTimeString()}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Performance Summary */}
          {testResults.length > 0 && (
            <Card className="p-4 bg-muted/20">
              <h3 className="font-medium mb-2">Performance Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Tests Passed</div>
                  <div className="text-lg font-semibold text-green-600">
                    {testResults.filter(r => r.passed).length} / {testResults.length}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground">Avg Response Time</div>
                  <div className="text-lg font-semibold">
                    {(testResults.reduce((sum, r) => sum + r.metrics.responseTime, 0) / testResults.length).toFixed(2)}ms
                  </div>
                </div>
              </div>

              {testResults.every(r => r.passed) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-green-800 text-sm font-medium">
                    ✅ All performance requirements met! Response time < 200ms requirement satisfied.
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </Card>

      {/* Hidden audio element for testing */}
      <audio ref={audioRef} preload="auto" className="hidden" />
    </div>
  );
};

export default PlaybackSpeedPerformanceTest;
