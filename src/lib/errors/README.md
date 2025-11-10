# Error Analytics and Tracking System (T061)

A comprehensive error analytics and tracking system for collecting, analyzing, and monitoring errors across the umuo.app application. This system provides real-time insights, pattern recognition, and proactive error management to improve application reliability and user experience.

## Overview

The Error Analytics System (T061) provides:

- **Real-time error tracking and monitoring**
- **Pattern recognition and anomaly detection**
- **Performance impact assessment**
- **Privacy-compliant data collection**
- **Integration with existing error handling infrastructure**
- **Comprehensive analytics dashboard**
- **Automated alerting and notifications**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Analytics System                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Error          │  │  Real-time      │  │  Integration    │  │
│  │  Analytics      │  │  Monitoring     │  │  Utilities      │  │
│  │  (Core)         │  │  & Alerting     │  │  & Hooks        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Storage        │  │  Pattern        │  │  Dashboard      │  │
│  │  Management     │  │  Recognition    │  │  Generation     │  │
│  │  & Privacy      │  │  & Prediction    │  │  & Reporting    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌─────────────────────────┐
                    │  Existing Error         │
                    │  Handling Infrastructure │
                    └─────────────────────────┘
```

## Quick Start

### Basic Setup

```typescript
import { quickStartAnalytics } from '@/lib/errors';

// Initialize with default configuration
const analytics = quickStartAnalytics();

// Start collecting errors automatically
console.log('Error analytics started!');
```

### Advanced Configuration

```typescript
import { 
  initializeErrorAnalytics, 
  ConsentLevel,
  AlertSeverity 
} from '@/lib/errors';

const analytics = await initializeErrorAnalytics({
  // Data collection settings
  enableRealTimeCollection: true,
  enableUserBehaviorTracking: true,
  enablePerformanceMetrics: true,
  enableSystemInfoCollection: true,

  // Privacy and compliance
  defaultConsentLevel: ConsentLevel.FUNCTIONAL,
  dataRetentionDays: 90,
  anonymizePII: true,
  gdprCompliant: true,

  // Storage and processing
  storageQuota: 50, // MB
  batchSize: 100,
  processingInterval: 60000, // 1 minute
  enableCompression: true,

  // Alerts and monitoring
  enableAlerts: true,
  errorRateThreshold: 0.05, // 5%
  criticalErrorThreshold: 0.01, // 1%
  alertWebhooks: [
    'https://your-webhook-endpoint.com/alerts'
  ],
});
```

## Core Components

### ErrorAnalytics

The main analytics system that orchestrates error collection, processing, and analysis.

```typescript
import { ErrorAnalytics } from '@/lib/errors';

const analytics = ErrorAnalytics.getInstance({
  enableRealTimeCollection: true,
  enableAlerts: true,
});

// Record an error manually
await analytics.recordError(appError, {
  additionalContext: 'user_action',
});

// Get analytics data
const data = await analytics.getAnalyticsData({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date(),
});

// Get dashboard data
const dashboard = await analytics.getDashboardData();
```

### ErrorCollector

Collects and enriches error events with context, system information, and user behavior data.

```typescript
import { ErrorCollector } from '@/lib/errors';

const collector = new ErrorCollector(config);

// Create enriched error event
const errorEvent = await collector.createErrorEvent(appError, {
  userId: 'user_123',
  sessionId: 'session_456',
});
```

### PatternAnalyzer

Analyzes error patterns, detects anomalies, and provides predictions for proactive error prevention.

```typescript
import { PatternAnalyzer } from '@/lib/errors';

const analyzer = new PatternAnalyzer();

// Analyze patterns in error events
const patterns = await analyzer.analyzePatterns(errorEvents);

// Get predictions
const predictions = await analyzer.getPredictions('network_error');

// Detect anomalies
const anomalies = await analyzer.detectAnomalies(errorEvents);
```

### MetricsCalculator

Calculates comprehensive metrics for error analysis, performance impact, and user experience assessment.

```typescript
import { MetricsCalculator } from '@/lib/errors';

const calculator = new MetricsCalculator();

// Calculate metrics from error events
const metrics = await calculator.calculateMetrics(errorEvents);

// Update metrics incrementally
calculator.updateMetrics(newErrorEvent);
```

### DashboardGenerator

Generates dashboard data and exports analytics reports in various formats.

```typescript
import { DashboardGenerator } from '@/lib/errors';

const generator = new DashboardGenerator();

// Generate dashboard data
const dashboard = generator.generateDashboard(
  analyticsData,
  patterns,
  anomalies
);

// Export data as JSON
const jsonBlob = await generator.exportData(analyticsData, 'json');

// Export data as CSV
const csvBlob = await generator.exportData(analyticsData, 'csv');
```

## Real-time Monitoring

### ErrorMonitoringSystem

Provides real-time monitoring, alerting, and anomaly detection.

```typescript
import { ErrorMonitoringSystem, AlertType, AlertSeverity } from '@/lib/errors';

const monitoring = new ErrorMonitoringSystem(config);

// Start monitoring
monitoring.start();

// Add custom monitoring rule
monitoring.addRule({
  id: 'custom_error_spike',
  name: 'Custom Error Spike Detection',
  description: 'Detect custom error patterns',
  enabled: true,
  conditions: [{
    metric: 'errorRate',
    operator: 'gt',
    threshold: 0.1, // 10%
    timeWindow: 300000, // 5 minutes
  }],
  operator: 'AND',
  alertType: AlertType.ERROR_SPIKE,
  severity: AlertSeverity.HIGH,
  cooldownPeriod: 600000, // 10 minutes
  notifications: [],
});

// Handle alert events
monitoring.on('alert', (alert) => {
  console.log('Alert triggered:', alert);
});

// Get dashboard state
const dashboard = await monitoring.getDashboardState();
```

## Integration with Existing Components

### React Error Boundary

Enhanced React Error Boundary with automatic error tracking.

```typescript
import { AnalyticsErrorBoundary } from '@/lib/errors';

function App() {
  return (
    <AnalyticsErrorBoundary
      onError={(error, errorInfo) => {
        console.log('Error caught by boundary:', error);
      }}
    >
      <YourAppComponents />
    </AnalyticsErrorBoundary>
  );
}
```

### React Hook

Custom hook for error analytics in React components.

```typescript
import { useErrorAnalytics } from '@/lib/errors';

function MyComponent() {
  const { recordError, getAnalytics } = useErrorAnalytics();

  const handleError = async (error: Error) => {
    await recordError(error, {
      component: 'MyComponent',
      action: 'user_interaction',
    });
  };

  return <div onClick={() => handleError(new Error('Test'))}>Click me</div>;
}
```

### TanStack Query Integration

Enhanced TanStack Query configuration with analytics.

```typescript
import { useAnalyticsQuery, createAnalyticsQueryConfig } from '@/lib/errors';

// Configure query client
const queryClient = new QueryClient({
  defaultOptions: createAnalyticsQueryConfig(integrationManager),
});

// Use enhanced query hook
function MyComponent() {
  const { data, error } = useAnalyticsQuery(
    ['user', '123'],
    () => fetchUser('123')
  );

  // Errors are automatically tracked
  return <div>{data?.name}</div>;
}
```

### Middleware Integration

Enhanced middleware for Next.js and Express applications.

```typescript
import { createAnalyticsMiddleware } from '@/lib/errors';

// Next.js middleware
const analyticsMiddleware = createAnalyticsMiddleware();

export default analyticsMiddleware.nextjs;

// Express middleware
app.use(analyticsMiddleware.express);
```

## Storage and Privacy

### AnalyticsStorageManager

Privacy-compliant storage management with compression and data retention.

```typescript
import { AnalyticsStorageManager, ConsentLevel } from '@/lib/errors';

const storage = new AnalyticsStorageManager(config);

// Store error events
await storage.storeEvents(errorEvents);

// Get events with filtering
const events = await storage.getEvents({
  timeRange: { start: yesterday, end: now },
  errorTypes: ['network', 'timeout'],
  consentLevel: ConsentLevel.ANALYTICS,
});

// Update consent level
await storage.filterByConsentLevel(ConsentLevel.FUNCTIONAL);

// Get storage statistics
const stats = await storage.getStorageStats();
console.log('Storage used:', stats.storageUsed, 'bytes');
```

## Privacy and Compliance

### Data Anonymization

The system automatically anonymizes personally identifiable information (PII):

- User IDs are hashed
- IP addresses are truncated
- User agents are simplified
- Session IDs are anonymized

### Consent Management

Granular consent levels for different types of data collection:

```typescript
enum ConsentLevel {
  NONE = 'none',           // No data collection
  ESSENTIAL = 'essential', // Only essential error data
  FUNCTIONAL = 'functional', // Functional error data
  ANALYTICS = 'analytics',  // Full analytics data
  MARKETING = 'marketing',  // Marketing insights (rarely used)
}

// Set user consent
analytics.setConsentLevel(ConsentLevel.FUNCTIONAL);
```

### Data Retention

Automatic data cleanup based on configurable retention policies:

```typescript
const config = {
  dataRetentionDays: 90, // Keep data for 90 days
  enableCompression: true,
  storageQuota: 50, // MB
};
```

## Monitoring and Alerting

### Alert Configuration

Configure custom alerts for various error scenarios:

```typescript
monitoring.addRule({
  id: 'high_error_rate',
  name: 'High Error Rate Alert',
  enabled: true,
  conditions: [{
    metric: 'errorRate',
    operator: 'gt',
    threshold: 0.05, // 5%
    timeWindow: 300000, // 5 minutes
  }],
  operator: 'AND',
  alertType: AlertType.ERROR_SPIKE,
  severity: AlertSeverity.HIGH,
  cooldownPeriod: 600000, // 10 minutes
  notifications: [{
    type: 'webhook',
    endpoint: 'https://your-webhook.com/alerts',
    enabled: true,
  }],
  autoResolve: true,
  autoResolveCondition: '{metrics.errorRate} < 0.02',
});
```

### Alert Types

- **ERROR_SPIKE**: Sudden increase in error rate
- **NEW_ERROR_PATTERN**: Detection of new error types
- **PERFORMANCE_DEGRADATION**: Significant performance impact
- **RECOVERY_FAILURE**: Low recovery success rates
- **USER_IMPACT**: High user-impacting errors
- **SYSTEM_HEALTH**: Overall system health issues
- **ANOMALY_DETECTED**: Machine learning detected anomalies

## Dashboard and Reporting

### Dashboard Data Structure

```typescript
interface DashboardData {
  overview: {
    totalErrors: number;
    errorRate: number;
    recoveryRate: number;
    averageResolutionTime: number;
    trendDirection: 'improving' | 'degrading' | 'stable';
  };

  realTimeAlerts: AnomalyDetectionResult[];
  topErrors: ErrorSummary[];
  errorTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };

  performanceImpact: PerformanceImpactMetrics;
  userImpact: UserImpactMetrics;
  recoveryAnalytics: RecoveryAnalytics;

  predictions: PatternRecognitionResult[];
  recommendations: string[];
}
```

### Export Formats

Support for multiple export formats:

```typescript
// JSON export
const jsonBlob = await analytics.exportData('json');

// CSV export
const csvBlob = await analytics.exportData('csv');

// PDF report
const pdfBlob = await analytics.exportData('pdf');
```

## Performance Considerations

### Compression

Enable data compression to reduce storage usage:

```typescript
const config = {
  enableCompression: true,
  // Expect ~70% reduction in storage size
};
```

### Sampling

For high-volume applications, enable sampling:

```typescript
const config = {
  enableSampling: true,
  sampleRate: 0.1, // Track 10% of errors
};
```

### Aggregation

Enable data aggregation for improved performance:

```typescript
const config = {
  enableAggregation: true,
  aggregationWindow: 300000, // 5 minutes
};
```

## Advanced Usage

### Custom Pattern Recognition

```typescript
class CustomPatternAnalyzer extends PatternAnalyzer {
  async analyzeCustomPatterns(events: ErrorEvent[]): Promise<PatternRecognitionResult[]> {
    // Implement custom pattern detection logic
    const customPatterns = [];
    
    // Your custom analysis here
    
    return customPatterns;
  }
}

// Use custom analyzer
const customAnalyzer = new CustomPatternAnalyzer();
const patterns = await customAnalyzer.analyzePatterns(events);
```

### Third-Party Integrations

Integration with popular error monitoring services:

```typescript
const config = {
  enableSentryIntegration: true,
  enableDataDogIntegration: true,
  enableNewRelicIntegration: true,
  enableCustomWebhooks: true,
  webhookEndpoints: [
    'https://your-service.com/webhook',
  ],
};
```

### Custom Alert Handlers

```typescript
monitoring.on('alert', async (alert) => {
  // Custom alert handling logic
  if (alert.severity === AlertSeverity.CRITICAL) {
    // Send emergency notification
    await sendEmergencyNotification(alert);
  }
  
  // Create Jira ticket
  if (alert.type === AlertType.NEW_ERROR_PATTERN) {
    await createJiraTicket(alert);
  }
});
```

## Best Practices

### 1. Error Context

Always provide rich context when recording errors:

```typescript
await analytics.recordError(error, {
  userId: currentUser.id,
  action: 'file_upload',
  fileSize: file.size,
  fileType: file.type,
  networkCondition: navigator.connection?.effectiveType,
});
```

### 2. Privacy First

Always respect user privacy and consent:

```typescript
// Check consent before recording detailed analytics
if (userConsentLevel >= ConsentLevel.ANALYTICS) {
  await analytics.recordError(error, detailedContext);
} else {
  await analytics.recordError(error, minimalContext);
}
```

### 3. Performance Monitoring

Monitor the performance impact of the analytics system:

```typescript
// Monitor storage usage
const stats = await storage.getStorageStats();
if (stats.storageUsed > stats.storageQuota * 0.8) {
  console.warn('Analytics storage approaching quota limit');
}
```

### 4. Alert Management

Configure appropriate alert thresholds to avoid alert fatigue:

```typescript
// Set reasonable thresholds
const config = {
  errorRateThreshold: 0.05, // 5% error rate
  criticalErrorThreshold: 0.01, // 1% critical errors
};
```

### 5. Data Retention

Implement appropriate data retention policies:

```typescript
const config = {
  dataRetentionDays: 90, // GDPR recommendation
  anonymizePII: true,
  gdprCompliant: true,
};
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Enable compression: `enableCompression: true`
   - Reduce retention period: `dataRetentionDays: 30`
   - Enable sampling: `enableSampling: true`

2. **Slow Performance**
   - Increase processing interval: `processingInterval: 120000`
   - Enable aggregation: `enableAggregation: true`
   - Reduce batch size: `batchSize: 50`

3. **Missing Errors**
   - Check integration setup
   - Verify error handlers are calling analytics
   - Check browser console for errors

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Enable debug mode
if (process.env.NODE_ENV === 'development') {
  (window as any).__ERROR_ANALYTICS_DEBUG__ = true;
}
```

## API Reference

### Main Classes

- `ErrorAnalytics` - Core analytics system
- `ErrorCollector` - Error event collection
- `PatternAnalyzer` - Pattern recognition
- `MetricsCalculator` - Metrics calculation
- `DashboardGenerator` - Dashboard generation
- `AnalyticsStorageManager` - Storage management
- `ErrorMonitoringSystem` - Real-time monitoring
- `AnalyticsIntegrationManager` - Integration utilities

### Utility Functions

- `quickStartAnalytics()` - Quick initialization
- `initializeErrorAnalytics()` - Full initialization
- `handleErrorWithAnalytics()` - Enhanced error handling
- `createAnalyticsMiddleware()` - Middleware creation
- `getErrorAnalytics()` - Get analytics instance

### React Components

- `AnalyticsErrorBoundary` - Enhanced error boundary
- `useErrorAnalytics()` - React hook
- `useAnalyticsQuery()` - Query hook

## Contributing

When contributing to the error analytics system:

1. Follow the existing code patterns and TypeScript conventions
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Consider privacy and performance implications
5. Ensure backward compatibility

## License

This error analytics system is part of the umuo.app project and follows the same license terms.