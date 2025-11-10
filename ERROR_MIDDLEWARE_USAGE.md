# Error Handling Middleware Usage Guide

This guide demonstrates how to use the comprehensive error handling middleware system (T060) implemented for umuo.app.

## Overview

The error handling middleware system provides:
- **Centralized Error Processing**: Unified error handling across the application
- **User-Friendly Error Messages**: Automatic transformation of technical errors into user-friendly messages
- **Recovery Integration**: Automatic recovery strategy evaluation and execution
- **Performance Monitoring**: Real-time performance metrics and optimization
- **Mobile Optimizations**: Device-specific error handling optimizations
- **Developer Tools**: Debug utilities, error simulation, and performance analysis

## Quick Start

### 1. Basic Setup

```typescript
// src/middleware.ts
import { createNextJSMiddleware } from "@/lib/errors";

const errorMiddleware = createNextJSMiddleware({
  enabled: true,
  debugMode: process.env.NODE_ENV === "development",
  includeRoutes: ["/api"],
  excludeRoutes: ["/_next", "/api/health"],
});

export function middleware(request) {
  const result = await errorMiddleware(request);
  return result || NextResponse.next();
}
```

### 2. API Route Integration

```typescript
// src/app/api/example/route.ts
import { withErrorMiddleware } from "@/lib/errors";

const handler = withErrorMiddleware(async (req) => {
  // Your API logic here
  return { success: true, data: "result" };
}, {
  timeout: 30000,
  retryAttempts: 3,
});

export { handler as GET, handler as POST };
```

### 3. React Error Boundary

```typescript
// src/components/ErrorBoundaryWrapper.tsx
import { NextJSErrorBoundary } from "@/lib/errors";

function App() {
  return (
    <NextJSErrorBoundary
      onError={(error, errorInfo) => {
        console.error("React error:", error, errorInfo);
      }}
    >
      <YourApp />
    </NextJSErrorBoundary>
  );
}
```

### 4. TanStack Query Integration

```typescript
// src/hooks/useEnhancedQuery.ts
import { createEnhancedQueryOptions } from "@/lib/errors";
import { useQuery } from "@tanstack/react-query";

function useDataQuery(queryKey, queryFn) {
  return useQuery({
    queryKey,
    queryFn,
    ...createEnhancedQueryOptions({}, {
      enableRecovery: true,
      onError: (error, query) => {
        // Custom error handling
      },
    }),
  });
}
```

## Advanced Configuration

### Middleware Configuration

```typescript
import { errorMiddleware } from "@/lib/errors";

// Configure the middleware
errorMiddleware.configure({
  enabled: true,
  debugMode: false,
  enableClassification: true,
  enableRecovery: true,
  autoRecovery: true,
  maxRecoveryAttempts: 3,
  showUserFriendlyErrors: true,
  enableErrorNotifications: true,
  enablePerformanceMonitoring: true,
  maxErrorProcessingTime: 5000,
  enableMobileOptimizations: true,
  enableAnalytics: true,
  analyticsEndpoint: "https://your-analytics-endpoint.com/errors",
  errorFilters: [
    {
      id: "exclude-debug-errors",
      name: "Exclude Debug Errors",
      enabled: true,
      priority: 1,
      conditions: {
        severities: ["low", "info"],
      },
      action: "exclude",
    },
  ],
  routingRules: [
    {
      id: "critical-errors",
      name: "Critical Error Routing",
      enabled: true,
      priority: 1,
      conditions: {
        severities: ["critical"],
      },
      target: {
        type: "endpoint",
        destination: "/api/errors/critical",
        method: "POST",
      },
      async: true,
      retryAttempts: 3,
      retryDelay: 1000,
    },
  ],
});
```

### Custom Error Transformers

```typescript
// Custom error transformer example
const customTransformers = [
  {
    id: "api-error-transformer",
    name: "API Error Transformer",
    description: "Transform API errors with specific handling",
    priority: 1,
    conditions: {
      errorCategories: ["api"],
    },
    transform: async (error, analysis, context) => {
      if (error.statusCode === 429) {
        return {
          error: {
            ...error,
            retryAfter: error.headers?.["retry-after"] || 60,
          },
          analysis,
          userMessage: "Rate limit exceeded. Please try again in a minute.",
          recovery: {
            id: "rate-limit-recovery",
            type: "automatic",
            title: "Rate Limit Recovery",
            description: "Automatically retrying after rate limit",
            steps: [
              {
                id: "wait-step",
                title: "Waiting for rate limit reset",
                description: "Please wait while we reset the rate limit",
                type: "action",
                required: true,
                automated: true,
                estimatedDuration: 60000,
              },
            ],
            successProbability: 1.0,
            estimatedTime: 60000,
            requiredUserAction: false,
            allowSkip: false,
          },
        };
      }
      return { error, analysis };
    },
    tags: ["api", "rate-limit"],
    version: "1.0.0",
  },
];
```

## Mobile-Specific Features

### Mobile Error Handler Hook

```typescript
// src/hooks/useMobileErrorHandler.tsx
import { useMobileErrorHandler } from "@/lib/errors";

function MyComponent() {
  const { currentError, handleError, clearError, retry } = useMobileErrorHandler();

  const handleApiCall = async () => {
    try {
      // Make API call
      await apiCall();
    } catch (error) {
      await handleError(error);
    }
  };

  if (currentError) {
    return (
      <MobileErrorDisplay
        error={currentError.error}
        analysis={currentError.analysis}
        recovery={currentError.recovery}
        onDismiss={clearError}
        onRetry={retry}
      />
    );
  }

  return <button onClick={handleApiCall}>Make API Call</button>;
}
```

### Mobile Optimizations

```typescript
// Enable mobile-specific optimizations
errorMiddleware.configure({
  enableMobileOptimizations: true,
  mobilePerformanceMode: true,
  batteryOptimizations: true,
  networkOptimizations: true,
});
```

## Developer Tools

### Debug Mode

```typescript
// Enable debug mode in development
import { enableDebugMode, devWorkflowAutomation } from "@/lib/errors";

if (process.env.NODE_ENV === "development") {
  enableDebugMode({
    consoleOutput: true,
    visualIndicators: true,
    performanceMetrics: true,
    errorDetails: true,
  });

  // Set up development workflow
  devWorkflowAutomation.setupDevelopmentWorkflow();
}
```

### Error Simulation

```typescript
// Simulate errors for testing
import { errorSimulationEngine } from "@/lib/errors";

// Register custom error simulation
errorSimulationEngine.registerSimulation("custom-error", {
  type: "api_endpoint_error",
  category: "api",
  severity: "high",
  message: "Custom simulated error",
  probability: 1.0,
  delay: 1000,
});

// Trigger simulation
await errorSimulationEngine.triggerSimulation("custom-error");
```

### Performance Analysis

```typescript
// Analyze performance
import { performanceAnalyzer } from "@/lib/errors";

// Start performance collection
performanceAnalyzer.startCollection(5000);

// Generate performance report
const report = performanceAnalyzer.generateReport();
console.log("Performance Report:", report);
```

## Analytics and Monitoring

### Error Analytics

```typescript
// Get analytics data
import { errorMiddleware } from "@/lib/errors";

const analytics = errorMiddleware.getAnalytics();
console.log("Error Analytics:", analytics);

// Get statistics
const stats = errorMiddleware.getStatistics();
console.log("Error Statistics:", stats);
```

### Error Visualization

```typescript
// Generate error visualization
import { errorVisualizer } from "@/lib/errors";

const chartData = errorVisualizer.generateVisualization({
  type: "chart",
  timeRange: "24h",
  groupBy: "category",
  includeDetails: true,
  showTrends: true,
  interactive: true,
});
```

## Best Practices

### 1. Error Classification

- Ensure proper error categorization for better handling
- Use specific error types for different scenarios
- Provide meaningful error messages with context

### 2. Recovery Strategies

- Implement appropriate recovery actions for different error types
- Consider user experience when designing recovery flows
- Test recovery strategies thoroughly

### 3. Performance Optimization

- Monitor error handling performance regularly
- Optimize error processing time for better user experience
- Use caching for repetitive error scenarios

### 4. Mobile Considerations

- Account for network conditions on mobile devices
- Optimize for battery usage
- Consider touch interfaces in error recovery flows

### 5. Security

- Sanitize error messages to prevent information leakage
- Be careful with debug mode in production
- Validate error routing configurations

## Integration Examples

### Express.js Integration

```typescript
// Express.js server setup
import express from "express";
import { createExpressMiddleware, createExpressErrorHandler } from "@/lib/errors";

const app = express();

// Add error middleware
app.use(createExpressMiddleware({
  timeout: 30000,
  trustProxy: true,
  excludePaths: ["/health"],
}));

// Add error handler
app.use(createExpressErrorHandler({
  sendClientErrors: process.env.NODE_ENV !== "production",
  logErrors: true,
}));

app.listen(3000);
```

### Custom Error Boundary

```typescript
// Custom React Error Boundary
import { ErrorBoundaryProps, ReactErrorBoundary } from "@/lib/errors";

function CustomErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      fallback={({ error, retry }) => (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={retry}>Try Again</button>
        </div>
      )}
      onError={async (error, errorInfo) => {
        // Report to analytics
        console.error("Error boundary caught:", error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

## Keyboard Shortcuts (Development Mode)

When debug mode is enabled, these keyboard shortcuts are available:

- `Ctrl+Shift+E`: Toggle debug mode
- `Ctrl+Shift+S`: Trigger random error simulation
- `Ctrl+Shift+R`: Generate development report
- `Ctrl+Shift+C`: Clear all development data

## Troubleshooting

### Common Issues

1. **Middleware not processing errors**: Check that the middleware is properly configured and enabled
2. **Debug mode not working**: Ensure debug mode is enabled after importing the middleware
3. **Performance issues**: Review error processing time and optimize configuration
4. **Mobile optimizations not applying**: Check device detection and mobile-specific settings

### Debug Information

Use the developer tools to get detailed information:

```typescript
import { errorMiddleware, isDebugEnabled } from "@/lib/errors";

if (isDebugEnabled()) {
  console.log("Current configuration:", errorMiddleware.getConfiguration());
  console.log("Analytics:", errorMiddleware.getAnalytics());
  console.log("Statistics:", errorMiddleware.getStatistics());
}
```

## Support and Contributing

For issues, questions, or contributions related to the error handling middleware:

1. Check existing documentation and examples
2. Enable debug mode for detailed error information
3. Use the development tools for testing and analysis
4. Review performance metrics for optimization opportunities

The error handling middleware system is designed to be extensible and customizable. Feel free to adapt it to your specific needs and contribute improvements back to the project.