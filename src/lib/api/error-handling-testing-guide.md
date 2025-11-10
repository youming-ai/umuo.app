# Enhanced API Error Handling - Testing and Validation Guide

This document provides comprehensive testing strategies and validation procedures for the enhanced error handling system implemented across all API endpoints.

## Overview

The enhanced error handling system provides:
- **Comprehensive Error Classification**: Automatic categorization and analysis of errors
- **Mobile-Aware Handling**: Device-specific error optimization
- **Intelligent Recovery**: Smart retry logic and recovery strategies
- **Performance Monitoring**: Request timing and resource usage tracking
- **Analytics Integration**: Error tracking and user feedback collection

## Testing Strategy

### 1. Unit Testing

#### 1.1 Error Classification Tests
```typescript
// Test error classification accuracy
describe('Error Classification', () => {
  test('Classifies network errors correctly', async () => {
    const networkError = new Error('ECONNRESET');
    const analysis = await classifyError(networkError, mockContext);
    
    expect(analysis.category).toBe(ErrorCategory.NETWORK);
    expect(analysis.type).toBe(ErrorType.CONNECTION_FAILURE);
    expect(analysis.severity).toBe(ErrorSeverity.MEDIUM);
  });

  test('Classifies API key errors correctly', async () => {
    const authError = new Error('Invalid API key');
    const analysis = await classifyError(authError, mockContext);
    
    expect(analysis.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(analysis.type).toBe(ErrorType.API_AUTHENTICATION);
    expect(analysis.severity).toBe(ErrorSeverity.HIGH);
    expect(analysis.userActionRequired).toBe(true);
  });

  test('Classifies rate limit errors correctly', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    const analysis = await classifyError(rateLimitError, mockContext);
    
    expect(analysis.category).toBe(ErrorCategory.API);
    expect(analysis.type).toBe(ErrorType.API_RATE_LIMIT);
    expect(analysis.recoveryStrategy).toBe('exponential_backoff');
  });
});
```

#### 1.2 Mobile Optimization Tests
```typescript
describe('Mobile Optimization', () => {
  test('Optimizes errors for mobile devices', () => {
    const mobileContext = createMobileDeviceContext();
    const error = createTestError();
    
    const optimizedResponse = createMobileOptimizedError(error, mobileContext);
    
    expect(optimizedResponse.mobile.optimized).toBe(true);
    expect(optimizedResponse.mobile.batteryOptimized).toBe(mobileContext.isLowPowerMode);
    expect(optimizedResponse.mobile.networkOptimized).toBe(mobileContext.networkType === 'cellular');
  });

  test('Shortens error messages for mobile', () => {
    const longMessage = "Please check your internet connection and try again.";
    const shortMessage = getMobileOptimizedMessage(longMessage);
    
    expect(shortMessage.length).toBeLessThan(longMessage.length);
    expect(shortMessage).toBe("Check connection & retry.");
  });
});
```

#### 1.3 Recovery Strategy Tests
```typescript
describe('Recovery Strategies', () => {
  test('Calculates correct retry delays', () => {
    const networkError = createNetworkError();
    const delay1 = calculateRetryDelay(networkError.analysis, 0);
    const delay2 = calculateRetryDelay(networkError.analysis, 1);
    
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay1).toBe(1000); // Base delay for network errors
  });

  test('Determines max retry attempts correctly', () => {
    const validationError = createValidationError();
    const networkError = createNetworkError();
    
    expect(getMaxRetries(validationError.analysis)).toBe(0);
    expect(getMaxRetries(networkError.analysis)).toBe(3);
  });
});
```

### 2. Integration Testing

#### 2.1 API Endpoint Tests
```typescript
describe('API Endpoint Error Handling', () => {
  test('Transcription endpoint handles Groq API errors', async () => {
    // Mock Groq API to return an error
    mockGroqClient.mockRejectedValue(new Error('API key invalid'));
    
    const response = await POST(createMockRequest({
      audio: createMockAudioFile(),
      language: 'en'
    }));
    
    expect(response.status).toBe(401);
    const errorData = await response.json();
    expect(errorData.error.type).toBe('api_authentication');
    expect(errorData.error.recovery.canRetry).toBe(false);
    expect(errorData.mobile.optimized).toBe(true);
  });

  test('Postprocess endpoint handles timeout errors', async () => {
    // Mock Groq client to timeout
    mockGroqClient.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    );
    
    const response = await POST(createMockRequest({
      segments: createMockSegments(),
      language: 'ja'
    }));
    
    expect(response.status).toBe(408);
    const errorData = await response.json();
    expect(errorData.error.type).toBe('connection_timeout');
    expect(errorData.error.recovery.canRetry).toBe(true);
  });

  test('Progress endpoint handles invalid file IDs', async () => {
    const response = await GET(
      createMockRequest(),
      { params: Promise.resolve({ fileId: 'invalid' }) }
    );
    
    expect(response.status).toBe(400);
    const errorData = await response.json();
    expect(errorData.error.type).toBe('input_validation');
    expect(errorData.error.userMessage).toContain('Invalid file ID');
  });
});
```

#### 2.2 Middleware Integration Tests
```typescript
describe('Middleware Integration', () => {
  test('Middleware processes errors correctly', async () => {
    const middleware = ErrorMiddleware.getInstance();
    const error = new Error('Test error');
    
    const result = await middleware.processError(
      error,
      mockAnalysis,
      mockContext
    );
    
    expect(result.userMessage).toBeDefined();
    expect(result.recovery).toBeDefined();
    expect(result.analysis).toBeDefined();
  });

  test('Rate limiting prevents excessive error reports', async () => {
    const errorHandler = EnhancedAPIErrorHandler.getInstance();
    
    // Make multiple requests rapidly
    const requests = Array.from({ length: 15 }, () => 
      errorHandler.handleAPIError(
        new Error('Test error'),
        createMockRequest()
      )
    );
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => 
      r.headers.get('X-Rate-Limited') === 'true'
    );
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### 3. End-to-End Testing

#### 3.1 Client-Side Error Handling Tests
```typescript
describe('Enhanced Query Hooks', () => {
  test('useEnhancedQuery handles network errors', async () => {
    const { result } = renderHook(() => 
      useEnhancedQuery(
        ['test'],
        () => Promise.reject(new Error('Network error')),
        { enableEnhancedErrorHandling: true }
      )
    );
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error.analysis.category).toBe('network');
      expect(result.current.retryWithEnhancedHandling).toBeDefined();
    });
  });

  test('useEnhancedMutation provides recovery options', async () => {
    const { result } = renderHook(() => 
      useEnhancedMutation(
        () => Promise.reject(new Error('API error')),
        { enableEnhancedErrorHandling: true }
      )
    );
    
    act(() => {
      result.current.mutate();
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.retryWithEnhancedHandling).toBeDefined();
      expect(result.current.reportErrorFeedback).toBeDefined();
    });
  });
});
```

#### 3.2 Mobile Device Testing
```typescript
describe('Mobile Device Error Handling', () => {
  test('Touch-optimized errors on mobile devices', async () => {
    // Simulate mobile device
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    
    const { result } = renderHook(() => 
      useEnhancedQuery(
        ['test'],
        () => Promise.reject(new Error('Test error')),
        { enableMobileOptimizations: true }
      )
    );
    
    await waitFor(() => {
      expect(result.current.error.mobile.touchOptimized).toBe(true);
      expect(result.current.isBatteryOptimizedError()).toBeDefined();
    });
  });

  test('Battery optimization for low-power mode', async () => {
    // Simulate low power mode
    const mockDeviceInfo = {
      device_type: 'mobile',
      is_low_power_mode: true,
      network_type: 'cellular'
    };
    
    const response = await handleAPIError(
      new Error('Test error'),
      createMockRequest(),
      { deviceInfo: mockDeviceInfo }
    );
    
    expect(response.error.mobile.batteryOptimized).toBe(true);
    expect(response.error.mobile.networkOptimized).toBe(true);
  });
});
```

### 4. Performance Testing

#### 4.1 Error Processing Performance
```typescript
describe('Error Processing Performance', () => {
  test('Error classification completes within time limits', async () => {
    const startTime = Date.now();
    
    const analysis = await classifyError(
      new Error('Performance test error'),
      mockContext
    );
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(100); // Should complete in <100ms
    expect(analysis.confidence).toBeGreaterThan(0.8);
  });

  test('Middleware handles high error volumes efficiently', async () => {
    const errors = Array.from({ length: 100 }, (_, i) => 
      new Error(`Test error ${i}`)
    );
    
    const startTime = Date.now();
    
    const results = await Promise.all(
      errors.map(error => middleware.processError(error, mockAnalysis, mockContext))
    );
    
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / errors.length;
    
    expect(averageTime).toBeLessThan(50); // Average <50ms per error
    expect(results.every(r => r.userMessage)).toBe(true);
  });
});
```

### 5. Security Testing

#### 5.1 Error Information Sanitization
```typescript
describe('Security - Error Sanitization', () => {
  test('Sensitive information is removed from error messages', () => {
    const sensitiveError = new Error('API key gsk_1234567890abcdef failed');
    const sanitized = sanitizeErrorMessage(sensitiveError.message);
    
    expect(sanitized).not.toContain('gsk_1234567890abcdef');
    expect(sanitized).toContain('[token]');
  });

  test('Stack traces are only included in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const response = createErrorResponse(new Error('Test error'));
    
    expect(response.error.stack).toBeUndefined();
    
    process.env.NODE_ENV = originalEnv;
  });
});
```

### 6. Accessibility Testing

#### 6.1 Error Message Accessibility
```typescript
describe('Accessibility - Error Messages', () => {
  test('Error messages are screen reader compatible', () => {
    const error = createTestError();
    const userMessage = createUserFriendlyMessage(error);
    
    expect(userMessage.length).toBeGreaterThan(10);
    expect(userMessage.length).toBeLessThan(200);
    expect(userMessage).toMatch(/^[A-Z][^.?!]*[.?!]$/); // Proper sentence structure
  });

  test('Recovery instructions are clear and actionable', () => {
    const recovery = createRecoverySuggestion();
    
    expect(recovery.title).toBeDefined();
    expect(recovery.description).toBeDefined();
    expect(recovery.steps.length).toBeGreaterThan(0);
    expect(recovery.steps.every(step => 
      step.title && step.description && step.type
    )).toBe(true);
  });
});
```

## Validation Procedures

### 1. Automated Testing Pipeline

#### 1.1 Continuous Integration
```yaml
# .github/workflows/error-handling-tests.yml
name: Error Handling Tests

on:
  push:
    paths:
      - 'src/lib/api/**'
      - 'src/lib/errors/**'
  pull_request:
    paths:
      - 'src/lib/api/**'
      - 'src/lib/errors/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit:errors
      
      - name: Run integration tests
        run: npm run test:integration:errors
      
      - name: Run E2E tests
        run: npm run test:e2e:errors
      
      - name: Run performance tests
        run: npm run test:performance:errors
      
      - name: Generate coverage report
        run: npm run test:coverage:errors
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/errors.json
```

#### 1.2 Test Scripts
```json
{
  "scripts": {
    "test:unit:errors": "jest src/lib/errors --testPathPattern=unit",
    "test:integration:errors": "jest src/lib/api --testPathPattern=integration",
    "test:e2e:errors": "playwright test tests/error-handling/",
    "test:performance:errors": "jest src/lib/api --testPathPattern=performance",
    "test:coverage:errors": "jest src/lib/errors --coverage --coverageReporters=json",
    "test:errors:all": "npm run test:unit:errors && npm run test:integration:errors && npm run test:e2e:errors"
  }
}
```

### 2. Manual Testing Procedures

#### 2.1 Error Scenario Testing Checklist

**Network Errors:**
- [ ] Test with no internet connection
- [ ] Test with slow network (3G, 2G)
- [ ] Test with intermittent connection
- [ ] Test DNS resolution failures
- [ ] Test timeout scenarios

**API Errors:**
- [ ] Test invalid API key
- [ ] Test rate limiting (429 errors)
- [ ] Test quota exceeded (402 errors)
- [ ] Test service unavailable (503 errors)
- [ ] Test malformed API responses

**File System Errors:**
- [ ] Test file too large (>100MB)
- [ ] Test unsupported file formats
- [ ] Test corrupted files
- [ ] Test missing files
- [ ] Test permission denied

**Mobile-Specific Tests:**
- [ ] Test on iOS devices (Safari, Chrome)
- [ ] Test on Android devices (Chrome, Firefox)
- [ ] Test on tablets (iPad, Android tablets)
- [ ] Test with low battery mode
- [ ] Test with poor network connectivity

**Accessibility Tests:**
- [ ] Test with screen readers
- [ ] Test with high contrast mode
- [ ] Test with large text settings
- [ ] Test keyboard navigation
- [ ] Test color contrast compliance

### 3. Monitoring and Analytics

#### 3.1 Error Tracking Dashboard
```typescript
// Error monitoring metrics
interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByType: Record<ErrorType, number>;
  errorsByDeviceType: Record<string, number>;
  averageRecoveryTime: number;
  userFeedbackScores: number[];
  recoverySuccessRate: number;
}

// Analytics monitoring
const monitorErrorMetrics = (): void => {
  const metrics = getErrorMetrics();
  
  // Alert on high error rates
  if (metrics.totalErrors > 100) {
    sendAlert('High error rate detected');
  }
  
  // Alert on low recovery success rates
  if (metrics.recoverySuccessRate < 0.7) {
    sendAlert('Low recovery success rate');
  }
  
  // Track mobile device issues
  if (metrics.errorsByDeviceType.mobile > metrics.errorsByDeviceType.desktop * 2) {
    sendAlert('High mobile error rate');
  }
};
```

#### 3.2 Real User Monitoring (RUM)
```typescript
// Client-side error tracking
const setupClientErrorTracking = (): void => {
  window.addEventListener('error', (event) => {
    trackError({
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    trackError({
      type: 'promise_rejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });
};
```

### 4. Deployment Validation

#### 4.1 Production Readiness Checklist

**Code Quality:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage > 90% for error handling code
- [ ] No security vulnerabilities in dependencies
- [ ] Performance benchmarks met (<100ms error processing)

**Configuration:**
- [ ] Error analytics endpoint configured
- [ ] Environment variables set for all error handling features
- [ ] Logging levels appropriate for production
- [ ] Rate limiting configured

**Monitoring:**
- [ ] Error tracking dashboard set up
- [ ] Alerts configured for critical error patterns
- [ ] Real user monitoring implemented
- [ ] Performance monitoring in place

**Documentation:**
- [ ] API documentation updated with error response formats
- [ ] Troubleshooting guides completed
- [ ] Error handling patterns documented
- [ ] Integration examples provided

### 5. Regression Testing

#### 5.1 Error Regression Tests
```typescript
// Regression test suite for error handling
describe('Error Handling Regression Tests', () => {
  test('Previously fixed issues remain resolved', async () => {
    // Test for specific regression issues
    const regressionTests = [
      {
        name: 'Rate limit handling',
        test: () => testRateLimitHandling(),
      },
      {
        name: 'Mobile error display',
        test: () => testMobileErrorDisplay(),
      },
      {
        name: 'Recovery strategy execution',
        test: () => testRecoveryStrategy(),
      },
    ];
    
    for (const regressionTest of regressionTests) {
      await expect(regressionTest.test()).resolves.toBeUndefined();
    }
  });
});
```

## Success Criteria

The enhanced error handling system is considered successful when:

1. **Error Classification Accuracy**: >95% of errors are correctly classified
2. **Mobile Optimization**: All error responses are optimized for mobile devices
3. **Recovery Success Rate**: >80% of recoverable errors are resolved automatically
4. **Performance**: Error processing completes within 100ms for 99% of cases
5. **User Experience**: Error messages are clear, actionable, and accessible
6. **Analytics Coverage**: 100% of errors are tracked with appropriate context
7. **Testing Coverage**: >90% code coverage for error handling components

## Maintenance and Updates

### Regular Tasks
- Monthly review of error patterns and trends
- Quarterly updates to recovery strategies
- Annual security audit of error handling code
- Continuous monitoring of performance metrics

### Update Procedures
1. Test new error scenarios in development
2. Update classification rules as needed
3. Validate mobile optimizations
4. Deploy with feature flags
5. Monitor for regression issues
6. Update documentation

This comprehensive testing and validation plan ensures the enhanced error handling system provides robust, user-friendly error management across all devices and scenarios.