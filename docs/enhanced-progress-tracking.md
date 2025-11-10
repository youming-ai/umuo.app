# Enhanced Progress Tracking Integration Guide

## Overview

The enhanced progress tracking system provides robust, reliable transcription progress monitoring with automatic fallback mechanisms, conflict resolution, and device optimizations. This guide explains how to integrate it into your existing components.

## Key Features

### 1. Automatic Fallback Tiers
- **SSE (Server-Sent Events)**: Real-time updates for optimal connections
- **Polling**: Periodic updates for less stable connections
- **Periodic**: Throttled updates for poor connections
- **Mobile Optimized**: Battery-aware updates for mobile devices

### 2. Sync Manager
- **Conflict Resolution**: Smart algorithms to resolve progress data conflicts
- **Offline Support**: Queue progress updates when offline and sync when reconnected
- **Multiple Data Sources**: Combine progress from different sources (SSE, polling, server)

### 3. Device Optimization
- **Network Detection**: Automatically adapt update frequency based on network type
- **Battery Awareness**: Reduce update frequency when battery is low
- **Performance Monitoring**: Track health of connection and adjust accordingly

## Migration Guide

### From useTranscription to useTranscriptionWithProgress

#### Before (Standard Transcription)
```typescript
import { useTranscription } from "@/hooks/api/useTranscription";

const transcription = useTranscription();

const handleStart = async () => {
  await transcription.mutateAsync({
    fileId: 123,
    language: "ja",
    options: {
      enableChunking: true,
      progressTracking: true,
    },
  });
};
```

#### After (Enhanced Progress Tracking)
```typescript
import { useTranscriptionWithProgress } from "@/hooks/api/useTranscription";

const enhancedTranscription = useTranscriptionWithProgress();

const handleStart = async () => {
  const result = await enhancedTranscription.mutateAsync({
    fileId: 123,
    language: "ja",
    options: {
      enableChunking: true,
      progressTracking: true,
      enableEnhancedProgress: true, // Enable enhanced progress tracking
      deviceInfo: {
        device_type: "mobile", // or "desktop", "tablet"
        network_type: "wifi", // or "cellular", "unknown"
        battery_level: 0.8,
        is_low_power_mode: false,
      },
      fallbackConfig: {
        maxTierTransitions: 5,
        tierTransitionCooldown: 10000,
        healthCheckTimeout: 30000,
        enableMobileOptimizations: true,
      },
      progressSyncConfig: {
        conflictResolution: "smart",
        enableOfflineSupport: true,
        syncInterval: 1000,
        throttleMs: 200,
      },
    },
  });

  if (result.jobId) {
    console.log("Enhanced transcription job created:", result.jobId);
  }
};
```

### From useFileStatusManager to Enhanced Version

#### Before (Standard File Status)
```typescript
import { useFileStatusManager } from "@/hooks/useFileStatus";

const {
  startTranscription,
  isTranscribing,
  updateFileStatus,
} = useFileStatusManager(fileId);
```

#### After (Enhanced File Status)
```typescript
import { useFileStatusManager } from "@/hooks/useFileStatus";

const {
  startTranscription,
  isTranscribing,
  updateFileStatus,
  enhancedProgress,
  currentJobId,
  hasEnhancedProgress,
  stopEnhancedProgress,
  forceFallback,
  refetchProgress,
} = useFileStatusManager(fileId, {
  enableEnhancedProgress: true,
  fallbackConfig: {
    maxTierTransitions: 3,
    tierTransitionCooldown: 15000,
    healthCheckTimeout: 25000,
    enableMobileOptimizations: true,
  },
  progressSyncConfig: {
    conflictResolution: "latest",
    enableOfflineSupport: true,
    syncInterval: 1500,
    throttleMs: 300,
  },
});
```

### From usePlayerDataQuery to Enhanced Version

#### Before (Standard Player)
```typescript
import { usePlayerDataQuery } from "@/hooks/player/usePlayerDataQuery";

const {
  file,
  segments,
  isTranscribing,
  transcriptionProgress,
  startTranscription,
} = usePlayerDataQuery(fileId);
```

#### After (Enhanced Player)
```typescript
import { usePlayerDataQuery } from "@/hooks/player/usePlayerDataQuery";

const {
  file,
  segments,
  isTranscribing,
  transcriptionProgress,
  startTranscription,
  enhancedProgress,
  currentJobId,
  hasEnhancedProgress,
  stopEnhancedProgress,
  forceFallback,
} = usePlayerDataQuery(fileId, {
  enableEnhancedProgress: true,
  fallbackConfig: {
    maxTierTransitions: 4,
    tierTransitionCooldown: 12000,
    healthCheckTimeout: 20000,
    enableMobileOptimizations: true,
  },
  progressSyncConfig: {
    conflictResolution: "smart",
    enableOfflineSupport: true,
    syncInterval: 1200,
    throttleMs: 250,
  },
});
```

## Configuration Options

### Fallback Configuration
```typescript
interface FallbackConfig {
  maxTierTransitions?: number;        // Max number of tier transitions (default: 5)
  tierTransitionCooldown?: number;    // Cooldown between transitions in ms (default: 10000)
  healthCheckTimeout?: number;        // Health check timeout in ms (default: 30000)
  enableMobileOptimizations?: boolean; // Enable mobile-specific optimizations (default: true)
}
```

### Progress Sync Configuration
```typescript
interface ProgressSyncConfig {
  conflictResolution?: "latest" | "highest" | "lowest" | "weighted" | "priority" | "smart";
  enableOfflineSupport?: boolean;     // Enable offline queuing (default: true)
  syncInterval?: number;              // Sync interval in ms (default: 1000)
  throttleMs?: number;                // Throttle updates in ms (default: 200)
}
```

### Device Information
```typescript
interface DeviceInfo {
  type: "mobile" | "desktop" | "tablet";
  networkType?: "wifi" | "cellular" | "unknown";
  batteryLevel?: number;              // 0-1
  isLowPowerMode?: boolean;
}
```

## Progress Data Structure

The enhanced progress system provides detailed progress information:

```typescript
interface ProgressUpdate {
  overallProgress: number;           // 0-100
  currentStage: string;              // Current processing stage
  status: string;                    // Status: "queued", "processing", "completed", "failed"
  timestamp: number;                 // Unix timestamp
  stageProgress: {
    [stageName: string]: {
      progress: number;              // 0-100
      startTime?: number;
      endTime?: number;
      message?: string;
    };
  };
  metadata?: {
    jobId?: string;
    fileId?: number;
    error?: string;
    estimatedCompletionTime?: number;
  };
}
```

## Best Practices

### 1. Progressive Enhancement
- Start with standard progress tracking for basic functionality
- Enable enhanced progress tracking for better user experience
- Provide fallback UI for when enhanced features aren't available

### 2. Mobile Optimization
- Detect device type and adjust settings accordingly
- Use longer intervals on cellular networks
- Respect battery levels and low power mode

### 3. Error Handling
- Always handle connection failures gracefully
- Provide retry mechanisms for failed connections
- Show appropriate UI for different error states

### 4. Performance
- Use appropriate sync intervals based on use case
- Throttle updates to avoid overwhelming the UI
- Clean up progress trackers when components unmount

## Example Component

See `src/components/examples/EnhancedTranscriptionProgress.tsx` for a complete example of how to use the enhanced progress tracking system in a production component.

## API Integration

The enhanced progress system is integrated with the existing transcription API:

1. **Server-side**: Enhanced progress tracking is automatically enabled when `enhanced_progress=true` is sent in the form data
2. **Client-side**: Progress updates are received through multiple channels (SSE, polling, server responses)
3. **Database**: Progress data is stored in IndexedDB for offline support and historical tracking

## Testing

To test the enhanced progress tracking:

1. Enable enhanced progress in your component
2. Use network throttling in browser dev tools to simulate different connection conditions
3. Monitor the fallback behavior by disconnecting/reconnecting network
4. Check the browser console for detailed progress tracking logs

## Troubleshooting

### Common Issues

1. **Enhanced progress not working**
   - Ensure `enableEnhancedProgress: true` is set in options
   - Check that the API supports enhanced progress tracking
   - Verify device detection is working correctly

2. **Frequent fallbacks**
   - Check network stability and adjust health check timeout
   - Increase tier transition cooldown
   - Consider using more conservative sync settings

3. **High battery usage**
   - Enable mobile optimizations
   - Increase sync intervals
   - Respect low power mode settings

### Debug Information

Enable debug logging by setting log level in your component:

```typescript
// In development, you can add debug logging
console.log("Enhanced Progress Debug:", {
  currentTier: enhancedProgress.currentTier,
  healthMetrics: enhancedProgress.healthMetrics,
  fallbackHistory: enhancedProgress.fallbackHistory,
  conflicts: enhancedProgress.conflicts,
});
```

## Migration Checklist

- [ ] Update transcription hooks to use enhanced versions
- [ ] Add configuration options for enhanced progress tracking
- [ ] Update UI to display enhanced progress information
- [ ] Add error handling for enhanced progress features
- [ ] Test with different network conditions
- [ ] Verify mobile device compatibility
- [ ] Add progress tracking cleanup on component unmount
- [ ] Update documentation and component examples