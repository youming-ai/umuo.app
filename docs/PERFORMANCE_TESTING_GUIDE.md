# Performance Testing Guide

This comprehensive guide covers the automated performance testing framework implemented for the umuo-app language learning application.

## Overview

The performance testing system provides:

- **Core Web Vitals Monitoring**: LCP, FID, CLS, TTFB, INP measurements
- **Transcription Performance Testing**: Processing time, memory usage, queue times
- **Mobile Performance Metrics**: Touch response, gesture recognition, battery impact
- **Automated CI/CD Integration**: Regression detection and alerting
- **Real-World Scenario Testing**: Network variations, large file processing
- **Production Monitoring**: Continuous monitoring with intelligent alerting

## Architecture

### Core Components

1. **Performance Test Runner** (`src/lib/performance/performance-test-runner.ts`)
   - Orchestrates test execution
   - Manages baselines and trends
   - Generates comprehensive reports

2. **Automated Test Suite** (`src/lib/performance/automated-test-suite.ts`)
   - Predefined test cases for different performance categories
   - Real-world scenario testing
   - Mobile-specific performance tests

3. **Monitoring & Alerting** (`src/lib/performance/monitoring-alerting.ts`)
   - Continuous production monitoring
   - Intelligent alerting with multiple channels
   - Trend analysis and anomaly detection

4. **Testing Utilities** (`src/lib/performance/testing-utils.ts`)
   - Jest/Vitest integration
   - Custom matchers and assertions
   - Memory leak detection

5. **CI/CD Integration** (`scripts/performance-test.js`)
   - Automated testing in pipeline
   - Performance regression detection
   - Report generation

## Quick Start

### 1. Local Performance Testing

```bash
# Run all performance tests
pnpm test:performance

# Run specific test suites
pnpm test:performance -- suite=core-web-vitals
pnpm test:performance -- suite=transcription-performance

# Run with verbose output
VERBOSE_PERFORMANCE_TESTS=true pnpm test:performance
```

### 2. CI/CD Integration

```bash
# Run in CI environment (fail on regression)
pnpm test:performance:ci

# Generate performance report
pnpm performance-test --output-dir=./reports --fail-on-error=true
```

### 3. Production Monitoring

```typescript
import { performanceMonitoringAlerting } from '@/lib/performance/monitoring-alerting';

// Initialize monitoring
performanceMonitoringAlerting.initialize({
  enabled: true,
  alertChannels: [
    {
      id: 'slack',
      type: 'slack',
      config: { webhookUrl: 'your-slack-webhook' },
      enabled: true,
      severity: 'critical'
    }
  ],
  alertThresholds: {
    'largest-contentful-paint': { warning: 2500, critical: 4000 }
  }
});
```

## Configuration

### Performance Test Configuration

Create `performance.config.js` in your project root:

```javascript
module.exports = {
  // Test suites to run
  suites: ['core-web-vitals', 'transcription-performance', 'mobile-performance'],
  
  // Performance thresholds
  thresholds: {
    coreWebVitals: {
      'largest-contentful-paint': 2500,
      'first-input-delay': 100,
      'cumulative-layout-shift': 0.1
    },
    transcription: {
      'transcription-processing-time': 45000,
      'transcription-queue-time': 5000
    }
  },
  
  // Test environment
  environment: {
    deviceType: 'mobile',
    networkSpeed: '4g',
    cpuThrottling: 4
  },
  
  // Reporting
  reporting: {
    outputDir: './performance-reports',
    formats: ['json', 'markdown', 'junit'],
    generateBaseline: false
  }
};
```

### Monitoring Configuration

```typescript
interface MonitoringConfig {
  enabled: boolean;
  alertThresholds: AlertThresholds;
  alertChannels: AlertChannel[];
  monitoringWindow: number; // minutes
  aggregationInterval: number; // seconds
  alertCooldown: number; // minutes
  trendAnalysis: TrendAnalysisConfig;
  anomalyDetection: AnomalyDetectionConfig;
}
```

## Writing Performance Tests

### Basic Performance Test

```typescript
import { performanceTestUtils } from '@/lib/performance/testing-utils';
import { createPerformanceTestCase } from '@/lib/performance/performance-test-runner';

// Using test utilities
test('audio processing performance', async () => {
  const result = await performanceTestUtils.measureTime(async () => {
    return await processAudioFile(audioBuffer);
  }, 5);
  
  expect(result.time).toBeLessThan(10000); // 10 seconds
  expect(result.averageTime).toBeLessThan(8000);
});

// Using test case creation
const audioProcessingTest = createPerformanceTestCase(
  'audio-processing-speed',
  'Tests audio file processing performance',
  'transcription',
  async () => {
    const result = await processAudioFile(testAudioBuffer);
    return {
      'processing-time': result.processingTime,
      'throughput': result.throughput
    };
  },
  { timeout: 30000, retries: 2 }
);
```

### Memory Testing

```typescript
test('memory usage during transcription', async () => {
  const memoryResult = await performanceTestUtils.measureMemory(async () => {
    return await processLargeAudioFile(largeAudioBuffer);
  });
  
  expect(memoryResult.memoryDelta).toBeLessThan(50); // 50MB
  expect(memoryResult.memoryPeak).toBeLessThan(200); // 200MB
});

// Memory leak detection
test('no memory leaks in repeated operations', async () => {
  const leakResult = await performanceTestUtils.detectMemoryLeaks(
    () => performTranscriptionCycle(testAudioData),
    10, // iterations
    5   // threshold MB
  );
  
  expect(leakResult.hasLeak).toBe(false);
  expect(leakResult.averageGrowth).toBeLessThan(2);
});
```

### Frame Rate Testing

```typescript
test('maintains 60fps during playback', async () => {
  const frameRateResult = await performanceTestUtils.measureFrameRate(
    2000, // 2 seconds
    () => {
      // Simulate animation frame
      updatePlaybackUI();
    }
  );
  
  expect(frameRateResult.fps).toBeGreaterThan(55); // Allow some tolerance
  expect(frameRateResult.droppedFrames).toBeLessThan(5);
});
```

### Custom Performance Assertions

```typescript
import { setupPerformanceTesting } from '@/lib/performance/testing-utils';

const { performanceTestUtils } = setupPerformanceTesting();

test('custom performance assertions', async () => {
  const performance = performanceTestUtils.expectPerformance(
    await performanceTestUtils.measureTime(async () => {
      return await processUserInput(inputData);
    })
  );
  
  performance.toBeFasterThan(100);           // < 100ms
  performance.toBeWithinRange(50, 200);       // 50-200ms
  performance.toBeBetterThanBaseline(120);   // better than 120ms baseline
  performance.toNotHaveSignificantRegression(150, 5); // < 5% regression
});
```

## Test Categories

### 1. Core Web Vitals

- **Largest Contentful Paint (LCP)**: Main content loading time
- **First Input Delay (FID)**: Interactivity measurement
- **Cumulative Layout Shift (CLS)**: Visual stability
- **Time to First Byte (TTFB)**: Server response time
- **Interaction to Next Paint (INP)**: Responsiveness metric

### 2. Transcription Performance

- **Processing Time**: Audio to text conversion speed
- **Queue Time**: Wait time in processing queue
- **Concurrent Processing**: Multiple simultaneous jobs
- **Memory Usage**: Resource consumption during transcription
- **Large File Handling**: Performance with long audio files

### 3. Mobile Performance

- **Touch Response**: Touch interaction latency
- **Gesture Recognition**: Swipe, pinch performance
- **Memory Constraints**: Low-memory device performance
- **Battery Optimization**: Power consumption impact
- **Network Adaptation**: Performance on poor connections

### 4. UI Responsiveness

- **DOM Manipulation**: Layout and paint performance
- **Animation Frame Rate**: Smooth animation maintenance
- **Scroll Performance**: Scrolling smoothness and responsiveness
- **Input Responsiveness**: Form and control interaction speed
- **Progress Updates**: Performance during heavy processing

## Real-World Scenarios

### Large File Processing

```typescript
// Tests transcription with 1+ hour audio files
test('large file transcription performance', async () => {
  const scenarios = [
    { duration: 1800, size: 60 * 1024 * 1024 },  // 30 minutes
    { duration: 3600, size: 120 * 1024 * 1024 }, // 1 hour
    { duration: 7200, size: 240 * 1024 * 1024 }  // 2 hours
  ];
  
  for (const scenario of scenarios) {
    const result = await testLargeFileProcessing(scenario);
    expect(result.throughput).toBeGreaterThan(1.0); // 1x realtime
  }
});
```

### Network Condition Testing

```typescript
// Performance under various network conditions
test('performance on slow networks', async () => {
  const networkConditions = [
    { type: '2G', latency: 800, speed: 0.1 },
    { type: '3G', latency: 300, speed: 1.0 },
    { type: '4G', latency: 100, speed: 10.0 }
  ];
  
  for (const condition of networkConditions) {
    await mockNetworkConditions(condition);
    const result = await testAPIPerformance();
    expect(result.responseTime).toBeLessThan(getThresholdForNetwork(condition.type));
  }
});
```

### Battery Optimization Testing

```typescript
test('battery-optimized performance', async () => {
  // Simulate low power mode
  await mockBatteryStatus({ level: 0.2, charging: false });
  
  const batteryPerformance = await measurePerformanceWithOptimizations();
  expect(batteryPerformance.powerConsumption).toBeLessThan(normalPerformance.powerConsumption * 0.7);
  expect(batteryPerformance.functionalPerformance).toBeGreaterThan(0.8); // 80% of normal
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm ci
      
      - name: Run performance tests
        run: pnpm test:performance:ci
      
      - name: Upload performance reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-reports
          path: performance-reports/
      
      - name: Performance regression check
        run: |
          if [ -f "performance-reports/performance-regressions.txt" ]; then
            echo "Performance regressions detected!"
            cat performance-reports/performance-regressions.txt
            exit 1
          fi
```

### Vercel Integration

```javascript
// vercel.json
{
  "functions": {
    "api/performance-monitor.js": {
      "maxDuration": 30
    }
  },
  "build": {
    "env": {
      "PERFORMANCE_TESTING": "true"
    }
  }
}
```

## Production Monitoring

### Alert Channels

#### Webhook Integration

```typescript
performanceMonitoringAlerting.addAlertChannel({
  id: 'discord',
  type: 'webhook',
  config: {
    url: 'https://discord.com/api/webhooks/your-webhook',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  enabled: true,
  severity: 'critical'
});
```

#### Slack Integration

```typescript
performanceMonitoringAlerting.addAlertChannel({
  id: 'slack-alerts',
  type: 'slack',
  config: {
    webhookUrl: 'https://hooks.slack.com/services/your/slack/webhook',
    channel: '#performance-alerts',
    username: 'Performance Bot'
  },
  enabled: true,
  severity: 'all'
});
```

### Custom Alert Handlers

```typescript
// Custom alert handler for PagerDuty
performanceMonitoringAlerting.alertHandlers.set('pagerduty', {
  send: async (alert, config) => {
    const payload = {
      routing_key: config.routingKey,
      event_action: 'trigger',
      payload: {
        summary: `Performance Alert: ${alert.description}`,
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        source: 'umuo-app',
        component: alert.category,
        custom_details: {
          metric: alert.metric,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
          context: alert.context
        }
      }
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
});
```

## Best Practices

### Test Design

1. **Isolate Tests**: Run performance tests independently to avoid interference
2. **Warmup**: Include warmup iterations to account for JIT compilation
3. **Multiple Measurements**: Take multiple readings and use statistical analysis
4. **Environment Control**: Mock external dependencies for consistent results
5. **Baseline Management**: Establish and maintain performance baselines

### Threshold Setting

```typescript
// Set realistic thresholds based on user expectations
const thresholds = {
  // Core Web Vitals (Google's recommended values)
  'largest-contentful-paint': { warning: 2500, critical: 4000 },
  'first-input-delay': { warning: 100, critical: 300 },
  'cumulative-layout-shift': { warning: 0.1, critical: 0.25 },
  
  // Application-specific thresholds
  'transcription-processing-time': { 
    warning: 45000,  // 45s for 5-minute file
    critical: 90000  // 90s for 5-minute file
  },
  
  // Mobile-specific
  'touch-response-time': { warning: 100, critical: 200 }
};
```

### Regression Detection

```typescript
// Enable trend analysis for early regression detection
performanceMonitoringAlerting.initialize({
  trendAnalysis: {
    enabled: true,
    lookbackPeriod: 24, // hours
    minDataPoints: 10,
    trendThreshold: 10, // 10% change
    confidenceLevel: 0.9
  },
  anomalyDetection: {
    enabled: true,
    algorithm: 'z-score',
    sensitivity: 'medium',
    lookbackPeriod: 6 // hours
  }
});
```

## Troubleshooting

### Common Issues

1. **Flaky Performance Tests**:
   - Increase test timeout
   - Add more iterations
   - Check for external dependencies
   - Use proper test isolation

2. **Memory Leaks in Tests**:
   - Ensure proper cleanup in afterEach
   - Force garbage collection in tests
   - Check for event listener leaks
   - Use memory leak detection utilities

3. **CI/CD Performance Variations**:
   - Use consistent CI environment
   - Set appropriate resource limits
   - Implement statistical significance testing
   - Allow reasonable tolerance thresholds

### Debugging Tools

```typescript
// Enable detailed performance logging
if (process.env.DEBUG_PERFORMANCE) {
  performanceMonitor.setEnabled(true);
  performanceMonitor.setLogLevel('debug');
}

// Generate performance debug info
const debugInfo = performanceTestUtils.generateDebugReport();
console.log('Performance Debug Info:', debugInfo);
```

## Performance Metrics Reference

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|------------------|------|
| LCP | ≤2.5s | 2.5s-4s | >4s |
| FID | ≤100ms | 100ms-300ms | >300ms |
| CLS | ≤0.1 | 0.1-0.25 | >0.25 |
| INP | ≤200ms | 200ms-500ms | >500ms |

### Application Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Transcription Speed | ≥1.0x real-time | 0.5x-1.0x | <0.5x |
| Touch Response | ≤100ms | 100-200ms | >200ms |
| Memory Usage | ≤150MB | 150-300MB | >300MB |
| API Response | ≤500ms | 500ms-2s | >2s |

## Advanced Usage

### Custom Performance Metrics

```typescript
// Define custom metrics
const customMetric = {
  name: 'user-interaction-latency',
  category: 'ui' as const,
  measure: async () => {
    const start = performance.now();
    await simulateUserInteraction();
    return performance.now() - start;
  }
};

performanceMonitor.recordMetric(
  customMetric.name,
  await customMetric.measure(),
  customMetric.category
);
```

### Performance Budget Enforcement

```typescript
// Enforce performance budgets in build pipeline
const performanceBudgets = {
  javascript: 250000, // 250KB gzipped
  css: 50000,        // 50KB gzipped
  images: 500000,    // 500KB
  fonts: 100000      // 100KB
};

// Check budget compliance
const bundleAnalysis = await analyzeBundleSizes();
const violations = Object.entries(performanceBudgets).filter(
  ([asset, limit]) => bundleAnalysis[asset] > limit
);

if (violations.length > 0) {
  throw new Error(`Performance budget violations: ${violations.join(', ')}`);
}
```

### Performance Score Calculation

```typescript
function calculatePerformanceScore(metrics: Record<string, number>): number {
  const weights = {
    'largest-contentful-paint': 0.25,
    'first-input-delay': 0.20,
    'cumulative-layout-shift': 0.20,
    'transcription-speed': 0.15,
    'touch-response-time': 0.10,
    'memory-usage': 0.10
  };
  
  const scores = {
    'largest-contentful-paint': calculateLcpScore(metrics['largest-contentful-paint']),
    'first-input-delay': calculateFidScore(metrics['first-input-delay']),
    'cumulative-layout-shift': calculateClsScore(metrics['cumulative-layout-shift']),
    'transcription-speed': calculateTranscriptionScore(metrics['transcription-speed']),
    'touch-response-time': calculateTouchScore(metrics['touch-response-time']),
    'memory-usage': calculateMemoryScore(metrics['memory-usage'])
  };
  
  return Object.entries(weights).reduce(
    (total, [metric, weight]) => total + (scores[metric] * weight),
    0
  );
}
```

## Conclusion

This comprehensive performance testing framework provides everything needed to ensure the umuo-app maintains optimal performance across all devices and usage scenarios. By integrating these tests into your CI/CD pipeline and production monitoring, you can catch performance regressions early and maintain a high-quality user experience.

For additional support or questions about performance testing implementation, refer to the source code in the `src/lib/performance/` directory or create an issue in the project repository.