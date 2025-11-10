# Enhanced Progress Tracking Migration Guide

This guide helps you migrate from the existing transcription system to the enhanced progress tracking system with fallback tiers, sync management, and device optimization.

## Overview

The enhanced progress tracking system provides:
- **Multi-tier fallback system**: Automatic switching between SSE, polling, and periodic progress updates
- **Intelligent sync management**: Conflict resolution and data synchronization across multiple sources
- **Device optimization**: Mobile-specific optimizations and battery-aware processing
- **Enhanced reliability**: Robust error handling and automatic recovery
- **Backward compatibility**: Existing code continues to work without changes

## Key Components

### 1. Enhanced Transcription Hooks

- `useTranscriptionWithProgress()`: Enhanced version of `useTranscription()` with progress tracking
- `useEnhancedProgressTracking()`: Combines robust progress tracker with sync manager
- `useFileStatusManager()`: Updated file status manager with enhanced progress support

### 2. Progress Tracking Infrastructure

- **ProgressSyncManager**: Handles synchronization between different progress sources
- **RobustProgressTracker**: Provides multi-tier fallback functionality
- **TranscriptionJobManager**: Enhanced job management with progress tracking

### 3. Device Detection and Optimization

- **DeviceInfo**: Automatic device type detection (mobile, tablet, desktop)
- **Network detection**: WiFi vs cellular network detection
- **Battery awareness**: Low power mode and battery level detection

## Migration Steps

### Step 1: Update Existing Components (Backward Compatible)

Your existing code will continue to work without changes:

```tsx
// Existing code continues to work
const { startTranscription, isTranscribing } = useFileStatusManager(fileId);
const { file, segments, transcript } = usePlayerDataQuery(fileId);
```

### Step 2: Enable Enhanced Progress Tracking (Optional)

To enable enhanced progress tracking, pass the new options:

```tsx
// Enable enhanced progress tracking
const { 
  startTranscription, 
  isTranscribing,
  enhancedProgress,
  currentJobId,
  hasEnhancedProgress,
  stopEnhancedProgress,
  forceFallback 
} = useFileStatusManager(fileId, {
  enableEnhancedProgress: true,
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
});
```

### Step 3: Update Player Components (Optional)

Enhanced player components with progress tracking:

```tsx
const {
  file,
  segments,
  transcript,
  enhancedProgress,
  currentJobId,
  hasEnhancedProgress,
} = usePlayerDataQuery(fileId, {
  enableEnhancedProgress: true,
  fallbackConfig: {
    maxTierTransitions: 3,
    tierTransitionCooldown: 15000,
    healthCheckTimeout: 25000,
    enableMobileOptimizations: true,
  },
});
```

### Step 4: Add Progress UI Components (Optional)

Use the enhanced progress components:

```tsx
import { EnhancedTranscriptionProgress } from "@/components/examples/EnhancedTranscriptionProgress";

// Add to your component
<EnhancedTranscriptionProgress 
  fileId={fileId} 
  fileName={file?.name}
/>
```

## Configuration Options

### Fallback Configuration

```tsx
fallbackConfig: {
  maxTierTransitions: number,        // Maximum tier transitions (default: 5)
  tierTransitionCooldown: number,    // Cooldown between transitions in ms (default: 10000)
  healthCheckTimeout: number,        // Health check timeout in ms (default: 30000)
  enableMobileOptimizations: boolean // Enable mobile-specific optimizations (default: true)
}
```

### Sync Configuration

```tsx
progressSyncConfig: {
  conflictResolution: "latest" | "highest" | "lowest" | "weighted" | "priority" | "smart", // Strategy for resolving conflicts
  enableOfflineSupport: boolean,     // Enable offline queue support (default: true)
  syncInterval: number,             // Sync interval in ms (default: 1000)
  throttleMs: number               // Throttle updates in ms (default: 200)
}
```

## Enhanced Progress Data Structure

### Progress Update

```tsx
interface ProgressUpdate {
  timestamp: number;
  status: "idle" | "queued" | "uploading" | "processing" | "transcribing" | "post-processing" | "completed" | "failed" | "cancelled";
  currentStage: "upload" | "transcription" | "post-processing" | "completed" | "failed";
  overallProgress: number; // 0-100
  stageProgress: {
    upload: { progress: number; message?: string; };
    transcription: { progress: number; message?: string; };
    "post-processing": { progress: number; message?: string; };
  };
  metadata?: {
    deviceId?: string;
    sessionId?: string;
    errorType?: string;
    retryCount?: number;
  };
}
```

### Enhanced Progress Information

```tsx
// Enhanced progress tracking return value
{
  progress: ProgressUpdate | null,
  isConnected: boolean,
  isLoading: boolean,
  error: Error | null,
  
  // Robust progress features
  currentTier: "sse" | "polling" | "periodic",
  healthMetrics: {
    status: "connected" | "disconnected" | "degraded",
    score: number,
    consecutiveFailures: number,
    lastSuccessfulConnection: number,
    averageResponseTime: number,
    uptime: number,
    errorRate: number,
    lastHealthCheck: number,
    tierPerformance: {
      sse: { successRate: number; averageLatency: number; lastUsed: number; };
      polling: { successRate: number; averageLatency: number; lastUsed: number; };
      periodic: { successRate: number; averageLatency: number; lastUsed: number; };
    };
  },
  fallbackHistory: Array<{
    timestamp: number;
    fromTier: string;
    toTier: string;
    reason: string;
  }>,
  
  // Sync manager features
  syncStatus: "syncing" | "synced" | "conflict" | "offline" | "error",
  conflicts: Array<{
    progress: ProgressUpdate;
    source: "sse" | "polling" | "periodic" | "tracker" | "server";
    timestamp: number;
    reliability: number;
  }>,
  
  // Control functions
  start: () => Promise<void>,
  stop: () => Promise<void>,
  forceFallback: () => Promise<void>,
  refetch: () => void,
  forceConflictResolution: () => void,
  addProgressData: (data: ProgressUpdate, source: string, metadata?: any) => void,
}
```

## Device Detection

The system automatically detects device information:

```tsx
interface DeviceInfo {
  type: "mobile" | "desktop" | "tablet";
  networkType: "wifi" | "cellular" | "unknown";
  batteryLevel?: number; // 0-1
  isLowPowerMode?: boolean;
}
```

## Examples

### Basic Enhanced File Status Manager

```tsx
function FileStatusComponent({ fileId }: { fileId: number }) {
  const {
    isTranscribing,
    enhancedProgress,
    currentJobId,
    hasEnhancedProgress,
    startTranscription,
    forceFallback,
  } = useFileStatusManager(fileId, {
    enableEnhancedProgress: true,
    fallbackConfig: {
      maxTierTransitions: 5,
      enableMobileOptimizations: true,
    },
    progressSyncConfig: {
      conflictResolution: "smart",
      enableOfflineSupport: true,
    },
  });

  return (
    <div>
      <button onClick={startTranscription} disabled={isTranscribing}>
        {isTranscribing ? "转录中..." : "开始转录"}
      </button>
      
      {hasEnhancedProgress && enhancedProgress && (
        <div>
          <div>进度: {Math.round(enhancedProgress.progress?.overallProgress || 0)}%</div>
          <div>连接: {enhancedProgress.currentTier}</div>
          <div>状态: {enhancedProgress.syncStatus}</div>
          
          <button onClick={forceFallback}>
            强制降级
          </button>
        </div>
      )}
    </div>
  );
}
```

### Enhanced Player with Progress Tracking

```tsx
function EnhancedPlayer({ fileId }: { fileId: string }) {
  const {
    file,
    segments,
    transcript,
    enhancedProgress,
    hasEnhancedProgress,
  } = usePlayerDataQuery(fileId, {
    enableEnhancedProgress: true,
  });

  return (
    <div>
      {/* Standard player UI */}
      <AudioPlayer segments={segments} audioUrl={audioUrl} />
      
      {/* Enhanced progress tracking UI */}
      {hasEnhancedProgress && enhancedProgress && (
        <div className="mt-4 p-4 border rounded">
          <h3>转录进度</h3>
          <div className="flex items-center gap-2">
            <span>连接:</span>
            <Badge variant={enhancedProgress.isConnected ? "default" : "destructive"}>
              {enhancedProgress.currentTier}
            </Badge>
            <Badge variant="outline">
              {enhancedProgress.syncStatus}
            </Badge>
          </div>
          
          <Progress 
            value={enhancedProgress.progress?.overallProgress || 0} 
            className="mt-2"
          />
          
          {enhancedProgress.conflicts.length > 0 && (
            <div className="mt-2 text-sm text-yellow-600">
              检测到 {enhancedProgress.conflicts.length} 个冲突
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Progressive Enhancement

Start with basic functionality and gradually add enhanced features:

```tsx
// Start basic
const { startTranscription } = useFileStatusManager(fileId);

// Then enhance
const { 
  startTranscription,
  enhancedProgress,
  hasEnhancedProgress 
} = useFileStatusManager(fileId, { enableEnhancedProgress: true });
```

### 2. Device-Specific Configuration

Configure different settings based on device type:

```tsx
const { deviceInfo } = useDeviceInfo();

const config = {
  enableEnhancedProgress: true,
  fallbackConfig: {
    maxTierTransitions: deviceInfo?.type === "mobile" ? 3 : 5,
    enableMobileOptimizations: deviceInfo?.type === "mobile",
  },
  progressSyncConfig: {
    syncInterval: deviceInfo?.networkType === "cellular" ? 3000 : 1000,
  },
};
```

### 3. Error Handling

Implement proper error handling for enhanced progress:

```tsx
const { enhancedProgress, error } = useEnhancedProgressTracking(jobId, fileId);

useEffect(() => {
  if (error) {
    console.error("Progress tracking error:", error);
    // Fallback to basic progress or show error message
  }
}, [error]);
```

### 4. Performance Optimization

Only enable enhanced features when needed:

```tsx
// Only enable for large files or mobile devices
const shouldEnableEnhanced = fileSize > 10 * 1024 * 1024 || isMobile;

const { enhancedProgress } = useFileStatusManager(fileId, {
  enableEnhancedProgress: shouldEnableEnhanced,
});
```

## Troubleshooting

### Common Issues

1. **Enhanced progress not working**
   - Check that `enableEnhancedProgress: true` is set
   - Verify that jobId is being returned from transcription API
   - Check browser console for errors

2. **Performance issues on mobile**
   - Enable mobile optimizations: `enableMobileOptimizations: true`
   - Increase update intervals for cellular connections
   - Monitor battery level and reduce updates in low power mode

3. **Connection drops frequently**
   - Check network stability
   - Adjust fallback configuration: `maxTierTransitions: 3`
   - Enable offline support: `enableOfflineSupport: true`

4. **Progress conflicts**
   - Check sync configuration
   - Monitor conflict resolution logs
   - Consider using "smart" conflict resolution strategy

### Debug Tools

Use the enhanced progress debugging features:

```tsx
const { enhancedProgress } = useEnhancedProgressTracking(jobId, fileId, {
  fallbackConfig: {
    enableMobileOptimizations: true,
  },
  onTierChange: (transition) => {
    console.log("Tier transition:", transition);
  },
  onHealthChange: (metrics) => {
    console.log("Health metrics:", metrics);
  },
  onError: (error) => {
    console.error("Progress error:", error);
  },
});
```

## API Changes

### Enhanced Transcription API

The transcription API now supports enhanced progress options:

```tsx
// Enhanced transcription request
const formData = new FormData();
formData.append("audio", audioFile);
formData.append("enhanced_progress", "true");
formData.append("fallback_config", JSON.stringify({
  maxTierTransitions: 5,
  enableMobileOptimizations: true,
}));
formData.append("sync_config", JSON.stringify({
  conflictResolution: "smart",
  enableOfflineSupport: true,
}));

// Enhanced response includes job information
const response = await fetch("/api/transcribe", {
  method: "POST",
  body: formData,
});

const result = await response.json();
// result.data.job contains jobId, isChunked, totalChunks, etc.
```

## Migration Checklist

- [ ] Update imports for enhanced hooks (optional)
- [ ] Enable enhanced progress tracking in key components
- [ ] Add progress UI components (optional)
- [ ] Configure fallback and sync settings
- [ ] Test on different device types
- [ ] Test on different network conditions
- [ ] Monitor performance impact
- [ ] Update error handling (optional)

## Conclusion

The enhanced progress tracking system provides significant improvements in reliability and user experience while maintaining full backward compatibility. You can gradually adopt the new features based on your application needs and user requirements.

Start with the basic integration and progressively add enhanced features as needed. The system is designed to work seamlessly across different devices and network conditions with automatic optimizations.