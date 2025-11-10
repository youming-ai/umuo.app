# Error Boundary System

A comprehensive error boundary system for umuo.app that provides intelligent error handling, automatic recovery, and graceful degradation for better user experience.

## Overview

The error boundary system consists of several specialized components designed to handle different types of errors in specific contexts:

- **Main ErrorBoundary**: Core error handling with classification and recovery
- **PlayerErrorBoundary**: Specialized for audio player errors
- **TranscriptionErrorBoundary**: Handles transcription service errors
- **MobileErrorBoundary**: Mobile-optimized error handling
- **PerformanceErrorBoundary**: Performance-related error monitoring
- **FallbackUI**: Graceful degradation components
- **ErrorClassification**: Intelligent error categorization
- **ErrorBoundaryIntegration**: System-wide integration
- **ErrorBoundaryTesting**: Comprehensive testing utilities

## Features

### 🎯 Intelligent Error Classification
- Automatic error categorization (network, audio, transcription, mobile, performance, etc.)
- Severity assessment (low, medium, high, critical)
- Pattern recognition and predictive analysis
- Custom error categories support

### 🔄 Automatic Recovery
- Exponential backoff retry mechanisms
- Context-aware recovery strategies
- Mobile-optimized recovery flows
- Performance-aware recovery options

### 📱 Mobile Optimization
- Touch-friendly error displays
- Battery-aware error handling
- Network condition monitoring
- Device-specific recovery strategies

### 🎨 Graceful Degradation
- Fallback UI components for all error types
- Progressive enhancement approach
- Accessibility-compliant error messages
- Theme-aware error displays

### 🧪 Testing & Development
- Comprehensive error simulation tools
- Development mode with detailed error information
- Test suites for validation
- Performance monitoring integration

## Quick Start

### Basic Usage

```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

function App() {
  return (
    <ErrorBoundary>
      <YourAppComponents />
    </ErrorBoundary>
  );
}
```

### Advanced Integration

```tsx
import { 
  ErrorBoundaryIntegrationProvider,
  IntegratedErrorBoundary 
} from "@/components/ui/error-boundary";

function App() {
  return (
    <ErrorBoundaryIntegrationProvider
      config={{
        enableAutoRecovery: true,
        enableErrorReporting: true,
        enableAnalytics: true,
      }}
    >
      <IntegratedErrorBoundary type="page">
        <YourAppComponents />
      </IntegratedErrorBoundary>
    </ErrorBoundaryIntegrationProvider>
  );
}
```

## Components

### ErrorBoundary

The main error boundary component with comprehensive error handling.

```tsx
<ErrorBoundary
  fallbackMessage="Something went wrong"
  enableRecovery={true}
  showDetails={false}
  allowReport={true}
  maxErrors={5}
  onError={(error, errorInfo, context) => {
    console.error("Error caught:", error);
  }}
>
  <YourComponents />
</ErrorBoundary>
```

**Props:**
- `children`: React components to wrap
- `fallbackMessage`: Custom error message
- `enableRecovery`: Enable automatic recovery (default: true)
- `showDetails`: Show technical details (default: true in development)
- `allowReport`: Allow error reporting (default: true)
- `maxErrors`: Maximum errors before rate limiting (default: 10)
- `onError`: Custom error handler

### PlayerErrorBoundary

Specialized error boundary for audio player components.

```tsx
<PlayerErrorBoundary
  audioFile={{
    id: "audio-123",
    name: "sample.mp3",
    duration: 120,
  }}
  enableOfflineMode={true}
  enableAudioFallback={true}
  onAudioError={(error, audioInfo) => {
    console.log("Audio error:", error);
  }}
>
  <AudioPlayerComponent />
</PlayerErrorBoundary>
```

### TranscriptionErrorBoundary

Handles transcription service errors with retry mechanisms.

```tsx
<TranscriptionErrorBoundary
  transcriptionJob={{
    id: "job-123",
    fileId: "file-123",
    fileName: "audio.mp3",
    status: "processing",
  }}
  enableRetry={true}
  enableFallback={true}
  onRetryTranscription={(jobId) => {
    console.log("Retrying transcription:", jobId);
  }}
>
  <TranscriptionComponent />
</TranscriptionErrorBoundary>
```

### MobileErrorBoundary

Mobile-optimized error boundary with device-specific handling.

```tsx
<MobileErrorBoundary
  enableTouchOptimizations={true}
  enableBatteryOptimization={true}
  enableNetworkOptimization={true}
  enableOfflineMode={true}
  onMobileError={(error, context) => {
    console.log("Mobile error:", error);
  }}
>
  <MobileComponent />
</MobileErrorBoundary>
```

### PerformanceErrorBoundary

Monitors performance metrics and handles performance-related errors.

```tsx
<PerformanceErrorBoundary
  performanceThresholds={{
    maxMemoryUsage: 100, // MB
    maxCpuUsage: 80, // percentage
    maxFrameTime: 16.67, // milliseconds
    minFps: 30, // frames per second
  }}
  enableMonitoring={true}
  enableOptimization={true}
  onPerformanceError={(error, metrics) => {
    console.log("Performance error:", error);
  }}
>
  <PerformanceCriticalComponent />
</PerformanceErrorBoundary>
```

## Error Classification

### Built-in Categories

1. **Network Errors**: Connection issues, timeouts, API failures
2. **Audio Errors**: Playback problems, device issues, format incompatibility
3. **Transcription Errors**: Service failures, processing timeouts
4. **Mobile Errors**: Touch events, battery issues, network instability
5. **Performance Errors**: Memory usage, CPU usage, frame rate issues
6. **Storage Errors**: Database issues, quota exceeded
7. **Validation Errors**: Input validation, data format issues
8. **Authentication Errors**: Login failures, permission issues

### Custom Categories

```tsx
import { ErrorClassificationProvider } from "@/components/ui/error-boundary";

const customCategory = {
  id: "payment",
  name: "Payment Error",
  description: "Payment processing errors",
  icon: <CreditCardIcon />,
  color: "text-purple-500",
  severity: "high" as const,
  patterns: [/payment.*failed/i, /transaction.*error/i],
  recoveryStrategies: ["retry-payment", "use-alternative-method"],
};

<ErrorClassificationProvider
  config={{
    enableCustomCategories: true,
    customCategories: [customCategory],
  }}
>
  <App />
</ErrorClassificationProvider>
```

## Fallback UI Components

### Pre-built Fallbacks

```tsx
import { 
  NetworkErrorFallback,
  AudioPlayerFallback,
  TranscriptionFallback,
  MobileErrorFallback,
  PerformanceErrorFallback 
} from "@/components/ui/error-boundary";

// Usage
<ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => {}} />}>
  <NetworkDependentComponent />
</ErrorBoundary>
```

### Custom Fallbacks

```tsx
import { FallbackUI } from "@/components/ui/error-boundary";

const customFallback = (
  <FallbackUI
    type="custom"
    title="Custom Error"
    description="Something went wrong with our service"
    icon={<CustomIcon />}
    actions={[
      {
        id: "retry",
        label: "Try Again",
        onClick: () => window.location.reload(),
        primary: true,
      },
    ]}
    suggestions={[
      "Check your internet connection",
      "Try refreshing the page",
      "Contact support if the issue persists",
    ]}
  />
);
```

## Integration

### System-wide Integration

```tsx
import { ErrorBoundaryIntegrationProvider } from "@/components/ui/error-boundary";

function App() {
  return (
    <ErrorBoundaryIntegrationProvider
      config={{
        enableGlobalErrorHandling: true,
        enableQueryErrorHandling: true,
        enableNetworkErrorHandling: true,
        enablePerformanceMonitoring: true,
        enableErrorReporting: true,
        enableAutoRecovery: true,
        errorReportingEndpoint: "/api/errors/report",
      }}
    >
      <YourApp />
    </ErrorBoundaryIntegrationProvider>
  );
}
```

### Higher-Order Components

```tsx
import { 
  withErrorBoundary,
  withPageErrorBoundary,
  withPlayerErrorBoundary 
} from "@/components/ui/error-boundary";

// Wrap components with error boundaries
const ProtectedComponent = withErrorBoundary(MyComponent);
const ProtectedPage = withPageErrorBoundary(MyPage);
const ProtectedPlayer = withPlayerErrorBoundary(AudioPlayer);
```

## Testing

### Error Simulation

```tsx
import { 
  ErrorBoundaryTestProvider,
  ErrorTestingPanel,
  useErrorBoundaryTesting 
} from "@/components/ui/error-boundary";

function TestApp() {
  const { triggerError } = useErrorBoundaryTesting();

  return (
    <ErrorBoundaryTestProvider>
      <ErrorBoundary>
        <YourComponent />
      </ErrorBoundary>
      
      <button onClick={() => triggerError("networkTimeout")}>
        Trigger Network Error
      </button>
      
      <ErrorTestingPanel />
    </ErrorBoundaryTestProvider>
  );
}
```

### Development Tools

Press `Ctrl+Shift+E` to open the error testing panel in development mode.

## Configuration

### Error Boundary Presets

```tsx
import { ErrorBoundaryPresets, createErrorBoundary } from "@/components/ui/error-boundary";

// Use presets
const ProductionBoundary = createErrorBoundary("production");
const MobileBoundary = createErrorBoundary("mobile");
const DevelopmentBoundary = createErrorBoundary("development");

// Custom configuration
const CustomBoundary = createErrorBoundary("app");
```

### Performance Thresholds

```tsx
const performanceConfig = {
  maxMemoryUsage: 200, // 200MB
  maxCpuUsage: 90, // 90%
  maxFrameTime: 16.67, // 60fps
  maxLoadTime: 1000, // 1 second
  maxNetworkLatency: 500, // 500ms
  maxErrorRate: 2, // 2%
  minFps: 60, // 60fps minimum
};
```

## Best Practices

### 1. Strategic Placement

- Wrap entire app with main error boundary
- Use specialized boundaries for critical features
- Apply boundaries at component level for isolated failures

### 2. Error Recovery

- Enable automatic recovery for transient errors
- Provide manual recovery options for users
- Implement fallback functionality for critical features

### 3. User Experience

- Show clear, actionable error messages
- Provide contextual help and suggestions
- Maintain app functionality when possible

### 4. Performance

- Monitor error boundary performance impact
- Use rate limiting for error reporting
- Optimize error recovery strategies

### 5. Development

- Use testing utilities for validation
- Monitor error patterns and trends
- Continuously improve error handling

## Accessibility

All error boundary components are built with accessibility in mind:

- Screen reader compatible error messages
- Keyboard navigation support
- High contrast theme support
- ARIA labels and descriptions
- Focus management

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari 12+, Chrome Mobile 60+)

## Contributing

When adding new error types or recovery strategies:

1. Follow the existing patterns and interfaces
2. Add comprehensive tests
3. Update documentation
4. Consider accessibility implications
5. Test on various devices and browsers

## License

This error boundary system is part of the umuo.app project.