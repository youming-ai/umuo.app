# Error Logging and Monitoring System Documentation

## Overview

This document describes the comprehensive error logging and monitoring system (T064) implemented for umuo.app. The system provides structured error logging, real-time monitoring, alerting, and privacy-compliant error handling with mobile optimization.

## Architecture

### Core Components

1. **ErrorLogger** (`src/lib/errors/error-logging.ts`)
   - Main orchestrator for all logging operations
   - Singleton pattern with lazy initialization
   - Integrates with all error handling components

2. **LogManager**
   - Local log storage and retention
   - Structured log formatting
   - Filter-based log processing

3. **MonitoringManager**
   - Integration with external monitoring services (Sentry, DataDog, etc.)
   - Batch processing and retry logic
   - Service-specific transformations

4. **AlertManager** (`src/lib/errors/error-logging-components.ts`)
   - Configurable alerting rules
   - Multiple notification channels (Email, Slack, Webhook, Console)
   - Rate limiting and alert fatigue prevention

5. **MobileLoggerOptimizer** (`src/lib/errors/error-logging-components.ts`)
   - Battery-aware logging
   - Network optimization with offline buffering
   - Performance optimization for mobile devices

6. **PrivacyManager** (`src/lib/errors/error-logging-components.ts`)
   - PII detection and redaction
   - GDPR and compliance support
   - Configurable data handling strategies

7. **DeveloperTools** (`src/lib/errors/error-logging-components.ts`)
   - Real-time log inspection
   - Debug panel with keyboard shortcuts
   - Log export and analysis tools

## Key Features

### 1. Structured Logging

The system provides structured JSON logging with consistent format:

```typescript
interface StructuredLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    fingerprint?: string;
  };
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    // ... more context fields
  };
  performance?: {
    processingTime?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  mobile?: {
    platform?: string;
    deviceModel?: string;
    deviceClass?: "low" | "medium" | "high";
    connectionQuality?: "poor" | "fair" | "good" | "excellent";
  };
  pii?: {
    detected: boolean;
    redacted: boolean;
    fields?: string[];
  };
  // ... more fields
}
```

### 2. Log Levels

- **DEBUG** (0): Detailed debugging information
- **INFO** (1): General information about application state
- **WARN** (2): Potentially harmful situations
- **ERROR** (3): Error events that might still allow the application to continue
- **CRITICAL** (4): Very severe error events
- **FATAL** (5): Errors that cause the application to crash

### 3. Monitoring Service Integration

The system supports multiple monitoring services:

#### Sentry Integration
```typescript
{
  id: "sentry",
  type: "sentry",
  enabled: true,
  config: {
    dsn: "your-sentry-dsn",
    environment: "production",
    release: "1.0.0",
    tracesSampleRate: 0.1,
  }
}
```

#### DataDog Integration
```typescript
{
  id: "datadog",
  type: "datadog",
  enabled: true,
  config: {
    apiKey: "your-datadog-api-key",
    site: "datadoghq.com",
    service: "umuo-app",
    env: "production",
  }
}
```

#### Custom HTTP Endpoint
```typescript
{
  id: "custom",
  type: "custom",
  enabled: true,
  config: {
    endpoint: "https://your-logging-endpoint.com/logs",
    apiKey: "your-api-key",
    headers: {
      "Content-Type": "application/json",
      "X-App-Version": "1.0.0",
    },
  }
}
```

### 4. Alerting System

Configure alerting rules for different error patterns:

```typescript
{
  id: "critical-errors",
  name: "Critical Error Alerts",
  enabled: true,
  conditions: {
    errorSeverities: [ErrorSeverity.CRITICAL],
    threshold: {
      count: 1,
      timeWindow: 5 * 60 * 1000, // 5 minutes
      operator: "gte",
    },
  },
  alert: {
    title: "🚨 Critical Error Detected",
    message: "A critical error occurred: {{error.message}}",
    severity: "critical",
    channels: [
      {
        type: "slack",
        config: {
          webhookUrl: "https://hooks.slack.com/...",
          channel: "#alerts",
        },
      },
      {
        type: "email",
        config: {
          to: ["dev-team@example.com"],
          subject: "Critical Error Alert",
        },
      },
    ],
  },
}
```

### 5. Mobile Optimization

Battery-aware logging that adapts to device conditions:

```typescript
{
  batteryOptimization: {
    enabled: true,
    lowPowerMode: "reduce", // "disable" | "reduce" | "critical-only"
    batteryThreshold: 20, // Below this threshold, reduce logging
  },
  networkOptimization: {
    enabled: true,
    offlineBuffering: true,
    batchSize: 25,
    compressionEnabled: true,
    networkTypes: {
      wifi: "full",
      cellular: "reduced",
      ethernet: "full",
    },
  },
}
```

### 6. Privacy and PII Protection

Automatic PII detection and redaction:

```typescript
{
  piiDetection: {
    enabled: true,
    patterns: {
      email: true,
      phone: true,
      creditCard: true,
      ssn: true,
      ipAddress: true,
      address: false,
    },
  },
  redaction: {
    enabled: true,
    strategy: "mask", // "mask" | "remove" | "hash"
    maskChar: "*",
    preserveLength: true,
  },
}
```

## Integration Examples

### Basic Usage

```typescript
import { logError, logInfo, logWarning } from "@/lib/errors/error-logging";

// Log an error
await logError(
  new Error("Something went wrong"),
  {
    component: "transcription",
    action: "process_audio",
    fileId: 123,
  },
  { additionalContext: "value" }
);

// Log an info message
await logInfo(
  "Operation completed successfully",
  "success",
  {
    component: "transcription",
    action: "complete",
  }
);

// Log a warning
await logWarning(
  "Rate limit approaching",
  "rate_limit",
  {
    component: "api",
    action: "transcribe",
    userId: "user-123",
  }
);
```

### Integration with Existing Error Handler

```typescript
import { EnhancedErrorHandler } from "@/lib/errors/error-logger-example";

// Handle transcription errors
await EnhancedErrorHandler.handleTranscriptionError(
  error,
  fileId,
  jobId
);

// Handle API errors
await EnhancedErrorHandler.handleAPIError(
  error,
  "/api/transcribe",
  "POST",
  userId,
  sessionId
);

// Log successful operations
await EnhancedErrorHandler.logSuccess(
  "transcription_completed",
  "transcription_service",
  {
    fileId: 123,
    duration: 120000,
    wordCount: 250,
  }
);
```

### Custom Monitoring Service

```typescript
import { getLogger } from "@/lib/errors/error-logging";

const logger = getLogger();

await logger.initialize({
  monitoringManager: {
    services: [
      {
        id: "custom-metrics",
        type: "custom",
        enabled: true,
        config: {
          endpoint: "https://your-metrics-api.com/logs",
          headers: {
            "Authorization": `Bearer ${process.env.METRICS_API_KEY}`,
          },
        },
      },
    ],
  },
});
```

## Configuration

### Environment Variables

```bash
# Sentry integration
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Custom monitoring endpoint
ERROR_LOGGING_ENDPOINT=https://your-logging-endpoint.com/logs
ERROR_LOGGING_API_KEY=your-api-key

# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Initialization

```typescript
// In your app initialization (e.g., _app.tsx)
import { initializeErrorLogging } from "@/lib/errors/error-logger-example";

export async function initializeApp() {
  await initializeErrorLogging();
  // ... other initialization
}
```

## Developer Tools

### Keyboard Shortcuts

- **Ctrl+Shift+L**: Toggle debug panel
- **Ctrl+Shift+E**: Export logs
- **Ctrl+Shift+C**: Clear logs

### Debug Panel

The debug panel provides real-time log inspection in development mode:

- View logs by level and category
- Search and filter logs
- Export logs in JSON or CSV format
- View log statistics and analytics

### Log Browser API

```typescript
import { getLogger } from "@/lib/errors/error-logging";

const logger = getLogger();
const devTools = logger.getDeveloperTools();

// Get filtered logs
const logs = devTools.getLogs({
  level: LogLevel.ERROR,
  category: "transcription",
  search: "timeout",
  timeRange: {
    start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    end: new Date(),
  },
});

// Get statistics
const stats = devTools.getLogStats();
console.log(`Total logs: ${stats.total}`);
console.log(`By level:`, stats.byLevel);
console.log(`By category:`, stats.byCategory);

// Export logs
const jsonLogs = devTools.exportLogs("json");
const csvLogs = devTools.exportLogs("csv");
```

## Performance Considerations

### Memory Usage

- Logs are stored in memory with configurable limits
- Automatic cleanup based on retention policies
- Compression for long-term storage

### Network Usage

- Batch processing reduces HTTP requests
- Adaptive quality based on network conditions
- Offline buffering for intermittent connectivity

### Battery Usage

- Battery-aware logging reduces impact on mobile devices
- Automatic adjustment of logging frequency
- Configurable low-power mode behavior

## Privacy and Compliance

### GDPR Compliance

- Automatic PII detection and redaction
- Configurable data retention policies
- Support for data subject requests

### PII Detection Patterns

The system can detect:
- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers
- IP addresses
- Physical addresses (optional)

### Redaction Strategies

- **Mask**: Replace with asterisks while preserving length
- **Remove**: Completely remove the detected data
- **Hash**: Replace with a one-way hash of the data

## Monitoring and Alerting

### Alert Types

- **Critical Errors**: Immediate notification
- **Error Rate Thresholds**: Alert when error rate exceeds threshold
- **Service-Specific Alerts**: Custom alerts for different services
- **Performance Degradation**: Alerts for slow operations

### Notification Channels

- **Email**: SMTP-based email notifications
- **Slack**: Webhook-based Slack notifications
- **Webhook**: Custom HTTP endpoint notifications
- **Console**: Development-time console output

### Rate Limiting

- Configurable alert rate limits to prevent alert fatigue
- Cooldown periods between alerts
- Escalation paths for critical issues

## Troubleshooting

### Common Issues

1. **Logs not appearing in monitoring service**
   - Check service configuration and credentials
   - Verify network connectivity
   - Check service-specific error logs

2. **High memory usage**
   - Adjust log retention policies
   - Reduce batch sizes
   - Enable compression

3. **Missing context information**
   - Ensure error context is properly passed
   - Check context enrichment configuration
   - Verify mobile context detection

### Debug Information

Enable debug logging for troubleshooting:

```typescript
await logger.initialize({
  logManager: {
    level: LogLevel.DEBUG,
  },
  devTools: {
    enabled: true,
    debugUtils: {
      verboseLogging: true,
      performanceMetrics: true,
    },
  },
});
```

## Best Practices

1. **Use Structured Context**: Always provide relevant context when logging errors
2. **Set Appropriate Log Levels**: Use the correct log level for each situation
3. **Configure Retention Policies**: Balance between useful data and storage costs
4. **Monitor System Performance**: Regularly review logging system performance metrics
5. **Test Alerting Rules**: Verify that alerting rules work as expected
6. **Review Privacy Settings**: Ensure PII detection and redaction are properly configured

## Future Enhancements

1. **Machine Learning Integration**: Anomaly detection for unusual error patterns
2. **Advanced Analytics**: Predictive error analysis and trend detection
3. **Enhanced Mobile Features**: Native app integration and background processing
4. **Custom Dashboards**: Built-in visualization and analysis tools
5. **Integration Testing**: Automated testing of logging system performance