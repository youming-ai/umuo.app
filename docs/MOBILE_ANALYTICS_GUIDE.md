# Mobile Analytics Implementation Guide

This guide provides comprehensive instructions for implementing and using the mobile analytics system in umuo.app.

## Overview

The mobile analytics system provides:

- **Comprehensive data collection**: Device information, user behavior, performance metrics, and usage patterns
- **Privacy-compliant tracking**: GDPR-compliant consent management and data anonymization
- **Actionable insights**: KPI calculations, bottleneck detection, and usage pattern analysis
- **Efficient data transmission**: Batched uploads, compression, and offline storage
- **Mobile-specific optimizations**: Touch interaction tracking, battery optimization, and network adaptation

## Quick Start

### 1. Initialize Analytics

```typescript
import { 
  createMobileAnalytics, 
  createAnalyticsIntegration,
  AnalyticsIntegrationManager 
} from '@/lib/analytics';

// Initialize core analytics
const analytics = createMobileAnalytics({
  enabled: true,
  debugMode: process.env.NODE_ENV === 'development',
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  anonymizePII: true,
  collectDeviceInfo: true,
  collectUserBehavior: true,
  collectPerformanceMetrics: true,
  endpoint: '/api/analytics',
  compressionEnabled: true,
});

// Initialize integration manager
const integrationManager = createAnalyticsIntegration(analytics, {
  enableErrorTracking: true,
  enablePerformanceTracking: true,
  enableAudioTracking: true,
  enableTranscriptionTracking: true,
  enableFileTracking: true,
});

// Start analytics
await analytics.initialize();
await integrationManager.initialize();
```

### 2. Track User Interactions

```typescript
// Track custom events
await analytics.trackEvent('button_click', {
  buttonId: 'upload-btn',
  screen: 'home',
  context: 'file_upload',
});

// Track touch interactions
await analytics.trackTouchInteraction({
  target: 'play_button',
  interactionType: 'tap',
  position: { x: 100, y: 200 },
  duration: 150,
  success: true,
});
```

### 3. Track Audio Player Events

```typescript
import { AudioPlayerTrackingData } from '@/lib/analytics';

// Use integration manager for automatic tracking
await integrationManager.trackAudioPlayer({
  playerId: 'audio-player-1',
  fileId: 123,
  filename: 'lesson-1.mp3',
  duration: 300, // seconds
  currentTime: 45,
  playbackRate: 1.0,
  volume: 0.8,
  action: 'play',
  metadata: {
    codec: 'mp3',
    bitrate: 128,
    sampleRate: 44100,
  },
});
```

### 4. Track Transcription Progress

```typescript
import { TranscriptionTrackingData } from '@/lib/analytics';

// Start tracking
const trackingId = integrationManager.startTranscriptionTracking({
  fileId: 123,
  filename: 'lesson-1.mp3',
  fileSize: 5242880, // bytes
  duration: 300, // seconds
  language: 'en',
  model: 'whisper-large-v3-turbo',
});

// Update progress
integrationManager.updateTranscriptionProgress(trackingId, 0.45, {
  performance: {
    memoryUsage: 45, // MB
    cpuUsage: 12, // %
    networkUsage: 2.1, // MB
  },
});

// Complete tracking
await integrationManager.completeTranscriptionTracking(trackingId, {
  success: true,
  accuracy: 0.94,
  wordCount: 1250,
  processingTime: 15000, // ms
  performance: {
    realTimeFactor: 0.8, // processing time / audio duration
  },
});
```

### 5. Track File Operations

```typescript
import { FileOperationTrackingData } from '@/lib/analytics';

// Start upload tracking
const operationId = integrationManager.startFileOperationTracking({
  fileId: 123,
  filename: 'lesson-1.mp3',
  fileType: 'audio/mpeg',
  fileSize: 5242880,
  action: 'upload',
  context: {
    method: 'drag_drop',
    source: 'local',
    networkType: 'wifi',
  },
});

// Update progress
integrationManager.updateFileOperationProgress(operationId, 0.25);

// Complete upload
await integrationManager.completeFileOperation(operationId, {
  success: true,
  duration: 5000, // ms
  speed: 1048576, // bytes per second
});
```

## Advanced Usage

### 1. Custom Event Tracking

```typescript
// Define custom event mappings
const analytics = createMobileAnalytics({
  // ... other config
  customEventMappings: {
    'lesson_completed': 'TRANSCRIPTION_COMPLETE',
    'bookmark_added': 'BOOKMARK_CREATED',
    'settings_changed': 'PREFERENCE_UPDATED',
  },
});

// Track custom events
await analytics.trackEvent('lesson_completed', {
  lessonId: 'lesson-1',
  difficulty: 'intermediate',
  timeSpent: 1800, // seconds
  accuracy: 0.92,
});
```

### 2. Custom Context and Metrics

```typescript
// Add custom context providers
const integrationManager = createAnalyticsIntegration(analytics, {
  // ... other config
  customContextProviders: [
    () => ({
      userTier: localStorage.getItem('user_tier') || 'free',
      subscriptionStatus: localStorage.getItem('subscription_status') || 'inactive',
    }),
    () => ({
      appTheme: document.documentElement.getAttribute('data-theme'),
      fontSize: window.getComputedStyle(document.documentElement).fontSize,
    }),
  ],
  customMetrics: [
    () => ({
      active_files_count: document.querySelectorAll('.file-item.active').length,
      upload_queue_size: window.uploadQueue?.length || 0,
    }),
  ],
});
```

### 3. Generate Insights and KPIs

```typescript
import { AnalyticsInsightsEngine } from '@/lib/analytics';

const insightsEngine = new AnalyticsInsightsEngine({
  dataRetentionDays: 90,
  minimumSampleSize: 100,
  enablePredictiveAnalysis: true,
  enableAnomalyDetection: true,
});

// Generate insights from collected data
const insights = await insightsEngine.generateInsights({
  events: analyticsEvents,
  performanceMetrics: performanceData,
  behaviorMetrics: behaviorData,
  networkMetrics: networkData,
  reports: analyticsReports,
});

console.log('KPIs:', insights.kpis);
console.log('Bottlenecks:', insights.bottlenecks);
console.log('Recommendations:', insights.recommendations);
```

### 4. Real-time Monitoring

```typescript
// Get real-time insights
const realtimeInsights = await insightsEngine.getRealTimeInsights(
  recentEvents,
  300000 // 5 minutes window
);

// Handle anomalies
if (realtimeInsights.anomalies.length > 0) {
  realtimeInsights.anomalies.forEach(anomaly => {
    console.warn('Anomaly detected:', anomaly);
    // Trigger alert or intervention
  });
}

// Handle alerts
if (realtimeInsights.alerts.length > 0) {
  realtimeInsights.alerts.forEach(alert => {
    console.error('Performance alert:', alert);
    // Show user notification or take corrective action
  });
}
```

## Configuration

### Analytics Configuration

```typescript
interface MobileAnalyticsConfig {
  // General settings
  enabled: boolean;
  debugMode: boolean;
  batchSize: number;
  flushInterval: number; // ms
  maxRetries: number;
  retryDelay: number; // ms

  // Privacy settings
  anonymizePII: boolean;
  collectLocation: boolean;
  collectDeviceId: boolean;
  respectDoNotTrack: boolean;
  cookieConsentRequired: boolean;

  // Performance settings
  batteryConscious: boolean;
  networkAware: boolean;
  offlineBuffering: boolean;
  memoryLimit: number; // MB

  // Data collection settings
  collectUserBehavior: boolean;
  collectPerformanceMetrics: boolean;
  collectDeviceInfo: boolean;
  collectNetworkInfo: boolean;
  collectBatteryInfo: boolean;

  // Reporting settings
  endpoint?: string;
  apiKey?: string;
  enableRealtimeReporting: boolean;
  compressionEnabled: boolean;

  // Feature flags
  enableGestureTracking: boolean;
  enableVoiceCommands: boolean;
  enableOfflineMode: boolean;
  enableHapticFeedback: boolean;
}
```

### Integration Configuration

```typescript
interface AnalyticsIntegrationConfig {
  // Error tracking integration
  enableErrorTracking: boolean;
  errorSamplingRate: number; // 0-1
  trackUserAgent: boolean;
  trackBreadcrumbs: boolean;
  maxBreadcrumbs: number;

  // Performance integration
  enablePerformanceTracking: boolean;
  performanceSamplingRate: number; // 0-1
  trackResourceTiming: boolean;
  trackUserTiming: boolean;
  trackLongTasks: boolean;

  // Audio player integration
  enableAudioTracking: boolean;
  trackPlaybackEvents: boolean;
  trackPerformanceMetrics: boolean;
  trackUserInteractions: boolean;

  // Transcription integration
  enableTranscriptionTracking: boolean;
  trackProgressUpdates: boolean;
  trackPerformanceMetrics: boolean;
  trackErrorRecovery: boolean;

  // File management integration
  enableFileTracking: boolean;
  trackUploadProgress: boolean;
  trackStorageUsage: boolean;
  trackFileOperations: boolean;

  // Custom integration points
  customEventMappings: Record<string, AnalyticsEventType>;
  customContextProviders: Array<() => Record<string, any>>;
  customMetrics: Array<() => Record<string, number>>;
}
```

## Privacy and Consent

### Consent Management

```typescript
import { ConsentLevel } from '@/lib/analytics';

// Update user consent
await analytics.updateConsent(ConsentLevel.ANALYTICS);

// Check current consent
const status = analytics.getStatus();
console.log('Current consent level:', status.consentLevel);

// Withdraw consent
await analytics.updateConsent(ConsentLevel.NONE);
```

### Data Anonymization

The analytics system automatically handles:

- **PII removal**: Email, name, phone, address fields are anonymized
- **IP masking**: IP addresses are partially masked for privacy
- **User ID hashing**: User identifiers are hashed for anonymity
- **Location data**: Optional collection with explicit consent

## Performance Optimization

### Battery Optimization

```typescript
// Enable battery-conscious mode
const analytics = createMobileAnalytics({
  enabled: true,
  batteryConscious: true,
  networkAware: true,
  // Reduce tracking frequency on low battery
  adaptiveSampling: true,
});

// Monitor battery impact
const insights = await insightsEngine.generateInsights(data);
console.log('Battery impact:', insights.mobileInsights.batteryOptimization);
```

### Network Optimization

```typescript
// Configure network-aware transmission
const analytics = createMobileAnalytics({
  enabled: true,
  networkAware: true,
  offlineBuffering: true,
  compressionEnabled: true,
  adaptiveBatching: true,
  // Smaller batches on poor connections
  adaptiveBatchSize: true,
});
```

### Memory Optimization

```typescript
// Set memory limits
const analytics = createMobileAnalytics({
  enabled: true,
  memoryLimit: 50, // MB
  // Automatic cleanup when memory limit reached
  enableMemoryCleanup: true,
  // Compress stored data
  enableDataCompression: true,
});
```

## Error Handling

### Error Tracking

```typescript
// Track errors with context
await integrationManager.trackError(error, {
  level: 'error',
  tags: {
    component: 'audio-player',
    action: 'playback',
    fileId: '123',
  },
  extra: {
    currentTime: 45,
    playbackRate: 1.0,
    userTier: 'premium',
  },
  userContext: {
    sessionId: 'session-123',
    authenticated: true,
  },
});
```

### Error Recovery

```typescript
// Automatic error recovery strategies
const integrationManager = createAnalyticsIntegration(analytics, {
  enableErrorTracking: true,
  enableErrorRecovery: true,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffFactor: 2,
  },
});
```

## Best Practices

### 1. Event Naming

- Use consistent, descriptive event names
- Follow snake_case convention
- Include context in event names
- Example: `audio_playback_start`, `file_upload_complete`

### 2. Data Structure

- Keep event payloads small and focused
- Use consistent data types
- Include essential context but avoid PII
- Example: `fileId` instead of `fileName` when possible

### 3. Performance

- Use sampling for high-frequency events
- Batch related events together
- Compress large payloads
- Monitor memory usage

### 4. Privacy

- Always obtain user consent
- Anonymize sensitive data
- Follow GDPR and CCPA guidelines
- Provide opt-out mechanisms

### 5. Testing

- Test with different device types
- Verify offline functionality
- Test battery impact
- Validate data accuracy

## Integration Examples

### React Component Integration

```typescript
import { useEffect } from 'react';
import { useMobileAnalytics } from '@/lib/analytics';

function AudioPlayer({ fileId, filename }) {
  const { analytics, trackAudioPlayback } = useMobileAnalytics();

  const handlePlay = () => {
    trackAudioPlayback({
      fileId,
      filename,
      duration: audioRef.current.duration,
      currentTime: audioRef.current.currentTime,
      playbackRate: audioRef.current.playbackRate,
      volume: audioRef.current.volume,
      action: 'play',
    });
  };

  // Track component lifecycle
  useEffect(() => {
    analytics.trackEvent('component_mounted', {
      component: 'AudioPlayer',
      fileId,
    });

    return () => {
      analytics.trackEvent('component_unmounted', {
        component: 'AudioPlayer',
        fileId,
      });
    };
  }, [fileId]);

  return (
    <audio
      ref={audioRef}
      onPlay={handlePlay}
      // ... other props
    />
  );
}
```

### API Route Integration

```typescript
// pages/api/transcribe/route.ts
import { getMobileAnalytics } from '@/lib/analytics';

export default async function handler(req, res) {
  const analytics = getMobileAnalytics();

  try {
    // Start transcription tracking
    const trackingId = analytics.startTranscriptionTracking({
      fileId: req.body.fileId,
      filename: req.body.filename,
      fileSize: req.body.fileSize,
    });

    // Process transcription...
    const result = await processTranscription(req.body);

    // Complete tracking
    await analytics.completeTranscriptionTracking(trackingId, {
      success: true,
      accuracy: result.accuracy,
      wordCount: result.wordCount,
    });

    res.json(result);
  } catch (error) {
    // Track error
    await analytics.trackError(error, {
      context: 'api_transcription',
      fileId: req.body.fileId,
    });

    res.status(500).json({ error: error.message });
  }
}
```

## Troubleshooting

### Common Issues

1. **Events not being tracked**
   - Check if analytics is initialized
   - Verify consent level
   - Check debug mode logs

2. **High battery usage**
   - Reduce sampling rates
   - Enable battery-conscious mode
   - Optimize event frequency

3. **Memory leaks**
   - Set appropriate memory limits
   - Enable automatic cleanup
   - Monitor custom context providers

4. **Network performance issues**
   - Enable compression
   - Reduce batch sizes
   - Use offline buffering

### Debug Mode

```typescript
// Enable debug mode for detailed logging
const analytics = createMobileAnalytics({
  enabled: true,
  debugMode: true,
  // ... other config
});

// Debug mode provides:
// - Detailed event logging
// - Performance metrics
// - Error details
// - Integration status
```

## Monitoring and Maintenance

### Health Checks

```typescript
// Check analytics health
const status = analytics.getStatus();
console.log('Analytics Status:', status);

// Check integration health
const integrationStatus = integrationManager.getStatus();
console.log('Integration Status:', integrationStatus);

// Monitor performance bottlenecks
const insights = await insightsEngine.generateInsights(data);
if (insights.bottlenecks.length > 0) {
  console.warn('Performance bottlenecks detected:', insights.bottlenecks);
}
```

### Data Export

```typescript
// Export analytics data for analysis
const insights = await insightsEngine.generateInsights(data);

// Export to JSON
const jsonData = await insightsEngine.exportInsights(insights, 'json');

// Export to CSV
const csvData = await insightsEngine.exportInsights(insights, 'csv');

// Export to PDF
const pdfData = await insightsEngine.exportInsights(insights, 'pdf');
```

This comprehensive mobile analytics system provides deep insights into user behavior, performance, and app usage while maintaining privacy and optimizing for mobile constraints.