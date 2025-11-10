# Progress Tracking Components

A comprehensive set of React components for displaying real-time progress updates during audio file processing and transcription in the umuo.app language learning application.

## Components Overview

### ProgressIndicator (T030 Implementation)
The most advanced progress indicator with enhanced UI/UX features:

**Features:**
- ✅ Stage breakdown with visual progress indicators
- ✅ Interactive elements (clickable stages, expandable details)
- ✅ Mobile-optimized touch interactions
- ✅ Real-time connection health indicators
- ✅ Smooth animations and transitions
- ✅ Multiple variants (default, detailed, compact, minimal)

**Props:**
```typescript
interface ProgressIndicatorProps {
  progress: ProgressUpdate;
  variant?: "default" | "detailed" | "compact" | "minimal";
  showETA?: boolean;
  showDetails?: boolean;
  allowInteraction?: boolean;
  mobileOptimized?: boolean;
  className?: string;
  onStageClick?: (stage: string) => void;
  onRetry?: () => void;
  onCancel?: () => void;
}
```

**Usage Examples:**

```typescript
// Basic usage
import { ProgressIndicator } from '@/components/features/progress-tracking';

<ProgressIndicator
  progress={progressData}
  variant="default"
  onStageClick={(stage) => console.log('Stage:', stage)}
  onRetry={() => handleRetry()}
  onCancel={() => handleCancel()}
/>

// Mobile-optimized version
<ProgressIndicator
  progress={progressData}
  variant="compact"
  mobileOptimized={true}
  showETA={true}
  allowInteraction={true}
/>

// Detailed view with full interactions
<ProgressIndicator
  progress={progressData}
  variant="detailed"
  showDetails={true}
  onStageClick={handleStageDetails}
  onRetry={handleRetry}
/>
```

### Other Components

- **ProgressDisplay**: Basic progress display with stage indicators
- **ProgressBar**: Simple linear progress bar
- **StageIndicator**: Visual representation of processing stages
- **StatusMessage**: Status message display
- **ErrorDisplay**: Error state handling and display
- **ETAIndicator**: Estimated time remaining display

## Integration with Existing System

The ProgressIndicator seamlessly integrates with the existing progress tracking system:

### 1. Data Flow
```typescript
// Your existing progress data structure
const progress: ProgressUpdate = {
  jobId: "job-123",
  fileId: 456,
  status: "processing",
  overallProgress: 65,
  currentStage: "transcription",
  message: "Transcribing audio...",
  timestamp: Date.now(),
  stages: {
    upload: { progress: 100, ... },
    transcription: { progress: 75, ... },
    "post-processing": { progress: 0, ... }
  },
  mobileOptimizations: {
    connectionType: "wifi",
    batteryLevel: 85,
    isLowPowerMode: false
  }
};
```

### 2. Hook Integration
```typescript
// Use with existing progress hooks
import { useTranscriptionStatus } from '@/hooks/api/useTranscription';
import { ProgressIndicator } from '@/components/features/progress-tracking';

function TranscriptionProgress({ fileId }: { fileId: number }) {
  const { data: progress, error } = useTranscriptionStatus(fileId);

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  }

  if (!progress) {
    return <LoadingSpinner />;
  }

  return (
    <ProgressIndicator
      progress={progress}
      variant="default"
      mobileOptimized={true}
      onRetry={() => refetch()}
    />
  );
}
```

### 3. Player Integration
```typescript
// Integrate with the existing player system
import { usePlayerDataQuery } from '@/hooks/player/usePlayerDataQuery';

function PlayerPage({ fileId }: { fileId: number }) {
  const { data: playerData } = usePlayerDataQuery(fileId);

  return (
    <div className="space-y-4">
      {/* Existing player components */}
      <AudioPlayer />
      <SubtitleDisplay />
      
      {/* New enhanced progress indicator */}
      {playerData?.transcriptionProgress && (
        <ProgressIndicator
          progress={playerData.transcriptionProgress}
          variant="detailed"
          allowInteraction={true}
          onStageClick={(stage) => showStageDetails(stage)}
        />
      )}
    </div>
  );
}
```

## Mobile Optimization Features

The ProgressIndicator includes comprehensive mobile optimization:

### 1. Touch-Friendly Interactions
- Minimum 44px touch targets
- Touch-optimized stage indicators
- Smooth touch animations
- Responsive layouts

### 2. Performance Optimizations
- Reduced animations on low-power devices
- Optimized rendering for mobile browsers
- Memory-efficient state management
- Lazy loading of detailed views

### 3. Adaptive UI
- Connection health indicators
- Battery-aware performance scaling
- Responsive stage layouts
- Mobile-specific icons and labels

## Variants Explained

### Default Variant
- Balanced view with key features
- Overall progress ring with percentage
- Interactive stage rows
- Expandable details

### Detailed Variant
- Full expanded view with rich interactions
- Stage cards with comprehensive information
- Hover tooltips and visual feedback
- Advanced mobile optimizations

### Compact Variant
- Horizontal stage indicators
- Minimal text
- Quick progress overview
- Ideal for tight spaces

### Minimal Variant
- Simple progress ring only
- Essential information
- Minimal UI footprint
- Perfect for inline usage

## Customization

### 1. Styling
```typescript
<ProgressIndicator
  progress={progress}
  className="custom-progress-styles"
  variant="default"
/>
```

### 2. Behavior
```typescript
<ProgressIndicator
  progress={progress}
  allowInteraction={true}
  showETA={true}
  showDetails={true}
  onStageClick={(stage) => {
    // Custom stage interaction logic
    trackStageClick(stage);
    showStageModal(stage);
  }}
/>
```

### 3. Mobile Settings
```typescript
<ProgressIndicator
  progress={progress}
  mobileOptimized={true}
  variant={isMobile ? "compact" : "detailed"}
/>
```

## Testing

The component includes an example implementation for testing:

```typescript
import { ProgressIndicatorExample } from '@/components/features/progress-tracking';

// In your development environment
<ProgressIndicatorExample />
```

This provides a fully interactive demo with mock data to test all features and variants.

## Accessibility

- Full keyboard navigation support
- Screen reader compatible markup
- High contrast support via theme system
- ARIA labels and descriptions
- Focus management for interactive elements

## Performance Considerations

- Memoized components for optimal rendering
- Efficient state management
- Minimal re-renders during progress updates
- Optimized animations for smooth performance
- Memory leak prevention with proper cleanup