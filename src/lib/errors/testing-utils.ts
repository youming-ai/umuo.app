/**
 * Error Classification System Testing Utilities
 *
 * Testing utilities and mock error data for the enhanced error classification system.
 * Includes comprehensive test scenarios, mock data generators, and validation helpers.
 */

import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorAnalysis,
  ErrorContext,
  classifyError,
  ErrorClassifier
} from "./error-classifier";
import { RecoveryStrategy } from "./error-classifier";

// ============================================================================
// MOCK ERROR DATA GENERATORS
// ============================================================================

/**
 * Mock error data generator
 */
export class MockErrorGenerator {
  /**
   * Generate mock error with specific characteristics
   */
  static generateError(options: {
    type?: ErrorType;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    message?: string;
    statusCode?: number;
    code?: string;
    stack?: boolean;
    context?: Partial<ErrorContext>;
  }): Error {
    const {
      type = ErrorType.UNKNOWN_ERROR,
      category = ErrorCategory.UNKNOWN,
      severity = ErrorSeverity.LOW,
      message,
      statusCode,
      code,
      stack = true,
      context = {}
    } = options;

    const errorMessage = message || this.generateMessageForType(type);

    const error = new Error(errorMessage) as any;

    if (statusCode) error.statusCode = statusCode;
    if (code) error.code = code;
    if (stack) error.stack = this.generateMockStack();

    // Add context to error object for testing
    error.mockContext = {
      type,
      category,
      severity,
      ...context
    };

    return error;
  }

  /**
   * Generate message for error type
   */
  private static generateMessageForType(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.CONNECTION_FAILURE]: "Failed to connect to server",
      [ErrorType.CONNECTION_TIMEOUT]: "Request timed out",
      [ErrorType.API_AUTHENTICATION]: "Invalid API credentials",
      [ErrorType.API_RATE_LIMIT]: "Rate limit exceeded",
      [ErrorType.FILE_TOO_LARGE]: "File size exceeds maximum limit",
      [ErrorType.AUDIO_FORMAT_UNSUPPORTED]: "Audio format not supported",
      [ErrorType.TRANSCRIPTION_TIMEOUT]: "Transcription timed out",
      [ErrorType.INPUT_VALIDATION]: "Invalid input provided",
      [ErrorType.MEMORY_LEAK]: "Memory leak detected",
      [ErrorType.DATABASE_CONNECTION]: "Database connection failed",
      [ErrorType.UNKNOWN_ERROR]: "An unknown error occurred",

      // Network errors
      [ErrorType.DNS_RESOLUTION]: "DNS resolution failed",
      [ErrorType.SSL_CERTIFICATE]: "SSL certificate error",
      [ErrorType.PROXY_ERROR]: "Proxy server error",
      [ErrorType.NETWORK_UNAVAILABLE]: "Network unavailable",

      // API errors
      [ErrorType.API_AUTHORIZATION]: "Insufficient permissions",
      [ErrorType.API_QUOTA_EXCEEDED]: "API quota exceeded",
      [ErrorType.API_ENDPOINT_ERROR]: "API endpoint error",
      [ErrorType.API_RESPONSE_FORMAT]: "Invalid API response format",
      [ErrorType.API_VERSION_MISMATCH]: "API version mismatch",

      // File system errors
      [ErrorType.FILE_NOT_FOUND]: "File not found",
      [ErrorType.FILE_ACCESS_DENIED]: "File access denied",
      [ErrorType.FILE_CORRUPTED]: "File is corrupted",
      [ErrorType.DISK_SPACE_INSUFFICIENT]: "Insufficient disk space",
      [ErrorType.DOWNLOAD_FAILED]: "Download failed",

      // Audio processing errors
      [ErrorType.AUDIO_CODEC_ERROR]: "Audio codec error",
      [ErrorType.AUDIO_DECODE_FAILURE]: "Audio decode failed",
      [ErrorType.AUDIO_DURATION_EXCEEDED]: "Audio duration exceeded",
      [ErrorType.AUDIO_QUALITY_POOR]: "Poor audio quality",
      [ErrorType.AUDIO_SILENCE]: "No audio detected",

      // Transcription errors
      [ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE]: "Transcription service unavailable",
      [ErrorType.TRANSCRIPTION_MODEL_ERROR]: "Transcription model error",
      [ErrorType.TRANSCRIPTION_LANGUAGE_UNSUPPORTED]: "Language not supported",
      [ErrorType.TRANSCRIPTION_QUALITY_POOR]: "Poor transcription quality",

      // Validation errors
      [ErrorType.DATA_FORMAT_INVALID]: "Invalid data format",
      [ErrorType.REQUIRED_FIELD_MISSING]: "Required field missing",
      [ErrorType.CONSTRAINT_VIOLATION]: "Constraint violation",
      [ErrorType.TYPE_MISMATCH]: "Type mismatch",

      // Authentication errors
      [ErrorType.CREDENTIALS_INVALID]: "Invalid credentials",
      [ErrorType.TOKEN_EXPIRED]: "Token expired",
      [ErrorType.TOKEN_INVALID]: "Invalid token",
      [ErrorType.SESSION_EXPIRED]: "Session expired",
      [ErrorType.PERMISSION_DENIED]: "Permission denied",

      // Performance errors
      [ErrorType.CPU_THRESHOLD_EXCEEDED]: "CPU threshold exceeded",
      [ErrorType.RESPONSE_TIME_EXCEEDED]: "Response time exceeded",
      [ErrorType.CONCURRENT_LIMIT_EXCEEDED]: "Concurrent limit exceeded",
      [ErrorType.BOTTLENECK_DETECTED]: "Bottleneck detected",

      // Storage errors
      [ErrorType.QUOTA_EXCEEDED]: "Storage quota exceeded",
      [ErrorType.STORAGE_UNAVAILABLE]: "Storage unavailable",
      [ErrorType.INDEX_CORRUPTED]: "Index corrupted",
      [ErrorType.BACKUP_FAILED]: "Backup failed",
      [ErrorType.RESTORE_FAILED]: "Restore failed",

      // Database errors
      [ErrorType.DATABASE_TIMEOUT]: "Database timeout",
      [ErrorType.DATABASE_CONSTRAINT]: "Database constraint error",
      [ErrorType.DATABASE_MIGRATION]: "Database migration error",
      [ErrorType.TRANSACTION_ROLLBACK]: "Transaction rolled back",

      // State management errors
      [ErrorType.STATE_CORRUPTION]: "State corruption detected",
      [ErrorType.STATE_SYNC_FAILED]: "State sync failed",
      [ErrorType.HOOK_ERROR]: "React hook error",
      [ErrorType.QUERY_INVALIDATION_FAILED]: "Query invalidation failed",

      // UI rendering errors
      [ErrorType.COMPONENT_RENDER_ERROR]: "Component render error",
      [ErrorType.STYLESHEET_LOADING_FAILED]: "Stylesheet loading failed",
      [ErrorType.ASSET_LOADING_FAILED]: "Asset loading failed",
      [ErrorType.LAYOUT_SHIFT]: "Layout shift detected",

      // Third-party service errors
      [ErrorType.GROQ_API_ERROR]: "Groq API error",
      [ErrorType.VERCEL_DEPLOYMENT_ERROR]: "Vercel deployment error",
      [ErrorType.ANALYTICS_ERROR]: "Analytics error",
      [ErrorType.MONITORING_ERROR]: "Monitoring error",

      // Integration errors
      [ErrorType.WEBHOOK_FAILED]: "Webhook failed",
      [ErrorType.REAL_TIME_SYNC_FAILED]: "Real-time sync failed",
      [ErrorType.CACHE_SYNC_FAILED]: "Cache sync failed",

      // Generic errors
      [ErrorType.GENERIC_ERROR]: "Generic error",
      [ErrorType.UNEXPECTED_ERROR]: "Unexpected error",
      [ErrorType.DEPRECATED_FEATURE]: "Deprecated feature used",
      [ErrorType.FEATURE_NOT_AVAILABLE]: "Feature not available"
    };

    return messages[type] || "Mock error message";
  }

  /**
   * Generate mock stack trace
   */
  private static generateMockStack(): string {
    const frames = [
      "Error: Mock error message",
      "    at Component.render (/src/components/MockComponent.tsx:42:15)",
      "    at mountIndeterminateComponent (/node_modules/react-dom/cjs/react-dom.development.js:12345:14)",
      "    at beginWork (/node_modules/react-dom/cjs/react-dom.development.js:13456:16)",
      "    at HTMLUnknownElement.callCallback (/node_modules/react-dom/cjs/react-dom.development.js:14567:14)",
      "    at Object.invokeGuardedCallbackDev (/node_modules/react-dom/cjs/react-dom.development.js:15678:16)",
      "    at invokeGuardedCallback (/node_modules/react-dom/cjs/react-dom.development.js:16789:31)",
      "    at beginWork$1 (/node_modules/react-dom/cjs/react-dom.development.js:17890:20)"
    ];

    return frames.join("\n");
  }

  /**
   * Generate batch of mock errors
   */
  static generateBatch(count: number, variation?: "random" | "similar" | "diverse"): Error[] {
    const errors: Error[] = [];

    if (variation === "similar") {
      // Generate similar errors of the same type
      const baseType = this.getRandomErrorType();
      for (let i = 0; i < count; i++) {
        errors.push(this.generateError({
          type: baseType,
          message: `${this.generateMessageForType(baseType)} (${i + 1})`
        }));
      }
    } else if (variation === "diverse") {
      // Generate diverse errors across different categories
      const categories = Object.values(ErrorCategory);
      for (let i = 0; i < count; i++) {
        const category = categories[i % categories.length];
        const type = this.getRandomErrorTypeForCategory(category);
        errors.push(this.generateError({ type, category }));
      }
    } else {
      // Generate random errors
      for (let i = 0; i < count; i++) {
        errors.push(this.generateError());
      }
    }

    return errors;
  }

  /**
   * Get random error type
   */
  private static getRandomErrorType(): ErrorType {
    const types = Object.values(ErrorType);
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Get random error type for category
   */
  private static getRandomErrorTypeForCategory(category: ErrorCategory): ErrorType {
    const categoryTypes: Record<ErrorCategory, ErrorType[]> = {
      [ErrorCategory.NETWORK]: [
        ErrorType.CONNECTION_FAILURE,
        ErrorType.CONNECTION_TIMEOUT,
        ErrorType.DNS_RESOLUTION,
        ErrorType.NETWORK_UNAVAILABLE
      ],
      [ErrorCategory.API]: [
        ErrorType.API_AUTHENTICATION,
        ErrorType.API_RATE_LIMIT,
        ErrorType.API_QUOTA_EXCEEDED,
        ErrorType.API_ENDPOINT_ERROR
      ],
      [ErrorCategory.FILE_SYSTEM]: [
        ErrorType.FILE_NOT_FOUND,
        ErrorType.FILE_TOO_LARGE,
        ErrorType.UPLOAD_FAILED,
        ErrorType.DOWNLOAD_FAILED
      ],
      [ErrorCategory.AUDIO_PROCESSING]: [
        ErrorType.AUDIO_FORMAT_UNSUPPORTED,
        ErrorType.AUDIO_DECODE_FAILURE,
        ErrorType.AUDIO_QUALITY_POOR,
        ErrorType.AUDIO_SILENCE
      ],
      [ErrorCategory.TRANSCRIPTION]: [
        ErrorType.TRANSCRIPTION_TIMEOUT,
        ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE,
        ErrorType.TRANSCRIPTION_MODEL_ERROR,
        ErrorType.TRANSCRIPTION_QUALITY_POOR
      ],
      [ErrorCategory.VALIDATION]: [
        ErrorType.INPUT_VALIDATION,
        ErrorType.DATA_FORMAT_INVALID,
        ErrorType.REQUIRED_FIELD_MISSING,
        ErrorType.TYPE_MISMATCH
      ],
      [ErrorCategory.AUTHENTICATION]: [
        ErrorType.CREDENTIALS_INVALID,
        ErrorType.TOKEN_EXPIRED,
        ErrorType.PERMISSION_DENIED
      ],
      [ErrorCategory.PERFORMANCE]: [
        ErrorType.MEMORY_LEAK,
        ErrorType.CPU_THRESHOLD_EXCEEDED,
        ErrorType.RESPONSE_TIME_EXCEEDED,
        ErrorType.BOTTLENECK_DETECTED
      ],
      [ErrorCategory.STORAGE]: [
        ErrorType.QUOTA_EXCEEDED,
        ErrorType.STORAGE_UNAVAILABLE,
        ErrorType.BACKUP_FAILED
      ],
      [ErrorCategory.DATABASE]: [
        ErrorType.DATABASE_CONNECTION,
        ErrorType.DATABASE_TIMEOUT,
        ErrorType.DATABASE_CONSTRAINT,
        ErrorType.TRANSACTION_ROLLBACK
      ],
      [ErrorCategory.STATE_MANAGEMENT]: [
        ErrorType.STATE_CORRUPTION,
        ErrorType.STATE_SYNC_FAILED,
        ErrorType.HOOK_ERROR
      ],
      [ErrorCategory.UI_RENDERING]: [
        ErrorType.COMPONENT_RENDER_ERROR,
        ErrorType.ASSET_LOADING_FAILED,
        ErrorType.LAYOUT_SHIFT
      ],
      [ErrorCategory.THIRD_PARTY]: [
        ErrorType.GROQ_API_ERROR,
        ErrorType.ANALYTICS_ERROR,
        ErrorType.MONITORING_ERROR
      ],
      [ErrorCategory.INTEGRATION]: [
        ErrorType.WEBHOOK_FAILED,
        ErrorType.REAL_TIME_SYNC_FAILED,
        ErrorType.CACHE_SYNC_FAILED
      ],
      [ErrorCategory.GENERIC]: [
        ErrorType.GENERIC_ERROR,
        ErrorType.UNEXPECTED_ERROR,
        ErrorType.DEPRECATED_FEATURE
      ],
      [ErrorCategory.UNKNOWN]: [
        ErrorType.UNKNOWN_ERROR
      ]
    };

    const types = categoryTypes[category] || [ErrorType.UNKNOWN_ERROR];
    return types[Math.floor(Math.random() * types.length)];
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Test scenario definitions
 */
export const TestScenarios = {
  /**
   * Network error scenarios
   */
  networkErrors: [
    {
      name: "Connection failure",
      error: MockErrorGenerator.generateError({
        type: ErrorType.CONNECTION_FAILURE,
        message: "fetch failed",
        statusCode: 503
      }),
      expectedCategory: ErrorCategory.NETWORK,
      expectedType: ErrorType.CONNECTION_FAILURE,
      expectedSeverity: ErrorSeverity.HIGH
    },
    {
      name: "Connection timeout",
      error: MockErrorGenerator.generateError({
        type: ErrorType.CONNECTION_TIMEOUT,
        message: "Request timeout",
        statusCode: 408
      }),
      expectedCategory: ErrorCategory.NETWORK,
      expectedType: ErrorType.CONNECTION_TIMEOUT,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "Rate limit exceeded",
      error: MockErrorGenerator.generateError({
        type: ErrorType.API_RATE_LIMIT,
        message: "Rate limit exceeded",
        statusCode: 429
      }),
      expectedCategory: ErrorCategory.API,
      expectedType: ErrorType.API_RATE_LIMIT,
      expectedSeverity: ErrorSeverity.HIGH
    }
  ],

  /**
   * File system error scenarios
   */
  fileSystemErrors: [
    {
      name: "File too large",
      error: MockErrorGenerator.generateError({
        type: ErrorType.FILE_TOO_LARGE,
        message: "File too large",
        statusCode: 413
      }),
      expectedCategory: ErrorCategory.FILE_SYSTEM,
      expectedType: ErrorType.FILE_TOO_LARGE,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "File not found",
      error: MockErrorGenerator.generateError({
        type: ErrorType.FILE_NOT_FOUND,
        message: "File not found"
      }),
      expectedCategory: ErrorCategory.FILE_SYSTEM,
      expectedType: ErrorType.FILE_NOT_FOUND,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "Upload failed",
      error: MockErrorGenerator.generateError({
        type: ErrorType.UPLOAD_FAILED,
        message: "Upload failed"
      }),
      expectedCategory: ErrorCategory.FILE_SYSTEM,
      expectedType: ErrorType.UPLOAD_FAILED,
      expectedSeverity: ErrorSeverity.MEDIUM
    }
  ],

  /**
   * Audio processing error scenarios
   */
  audioProcessingErrors: [
    {
      name: "Unsupported audio format",
      error: MockErrorGenerator.generateError({
        type: ErrorType.AUDIO_FORMAT_UNSUPPORTED,
        message: "Audio format not supported"
      }),
      expectedCategory: ErrorCategory.AUDIO_PROCESSING,
      expectedType: ErrorType.AUDIO_FORMAT_UNSUPPORTED,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "Audio decode failure",
      error: MockErrorGenerator.generateError({
        type: ErrorType.AUDIO_DECODE_FAILURE,
        message: "Failed to decode audio"
      }),
      expectedCategory: ErrorCategory.AUDIO_PROCESSING,
      expectedType: ErrorType.AUDIO_DECODE_FAILURE,
      expectedSeverity: ErrorSeverity.HIGH
    },
    {
      name: "Poor audio quality",
      error: MockErrorGenerator.generateError({
        type: ErrorType.AUDIO_QUALITY_POOR,
        message: "Audio quality too poor for processing"
      }),
      expectedCategory: ErrorCategory.AUDIO_PROCESSING,
      expectedType: ErrorType.AUDIO_QUALITY_POOR,
      expectedSeverity: ErrorSeverity.LOW
    }
  ],

  /**
   * Transcription error scenarios
   */
  transcriptionErrors: [
    {
      name: "Transcription timeout",
      error: MockErrorGenerator.generateError({
        type: ErrorType.TRANSCRIPTION_TIMEOUT,
        message: "Transcription timed out"
      }),
      expectedCategory: ErrorCategory.TRANSCRIPTION,
      expectedType: ErrorType.TRANSCRIPTION_TIMEOUT,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "Service unavailable",
      error: MockErrorGenerator.generateError({
        type: ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE,
        message: "Transcription service temporarily unavailable"
      }),
      expectedCategory: ErrorCategory.TRANSCRIPTION,
      expectedType: ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE,
      expectedSeverity: ErrorSeverity.HIGH
    },
    {
      name: "Language not supported",
      error: MockErrorGenerator.generateError({
        type: ErrorType.TRANSCRIPTION_LANGUAGE_UNSUPPORTED,
        message: "Language not supported by transcription service"
      }),
      expectedCategory: ErrorCategory.TRANSCRIPTION,
      expectedType: ErrorType.TRANSCRIPTION_LANGUAGE_UNSUPPORTED,
      expectedSeverity: ErrorSeverity.MEDIUM
    }
  ],

  /**
   * Authentication error scenarios
   */
  authenticationErrors: [
    {
      name: "Invalid credentials",
      error: MockErrorGenerator.generateError({
        type: ErrorType.CREDENTIALS_INVALID,
        message: "Invalid credentials",
        statusCode: 401
      }),
      expectedCategory: ErrorCategory.AUTHENTICATION,
      expectedType: ErrorType.CREDENTIALS_INVALID,
      expectedSeverity: ErrorSeverity.CRITICAL
    },
    {
      name: "Token expired",
      error: MockErrorGenerator.generateError({
        type: ErrorType.TOKEN_EXPIRED,
        message: "Token has expired"
      }),
      expectedCategory: ErrorCategory.AUTHENTICATION,
      expectedType: ErrorType.TOKEN_EXPIRED,
      expectedSeverity: ErrorSeverity.CRITICAL
    },
    {
      name: "Permission denied",
      error: MockErrorGenerator.generateError({
        type: ErrorType.PERMISSION_DENIED,
        message: "Insufficient permissions",
        statusCode: 403
      }),
      expectedCategory: ErrorCategory.AUTHENTICATION,
      expectedType: ErrorType.PERMISSION_DENIED,
      expectedSeverity: ErrorSeverity.HIGH
    }
  ],

  /**
   * Performance error scenarios
   */
  performanceErrors: [
    {
      name: "Memory leak",
      error: MockErrorGenerator.generateError({
        type: ErrorType.MEMORY_LEAK,
        message: "Memory leak detected in component"
      }),
      expectedCategory: ErrorCategory.PERFORMANCE,
      expectedType: ErrorType.MEMORY_LEAK,
      expectedSeverity: ErrorSeverity.HIGH
    },
    {
      name: "Response time exceeded",
      error: MockErrorGenerator.generateError({
        type: ErrorType.RESPONSE_TIME_EXCEEDED,
        message: "Response time exceeded threshold"
      }),
      expectedCategory: ErrorCategory.PERFORMANCE,
      expectedType: ErrorType.RESPONSE_TIME_EXCEEDED,
      expectedSeverity: ErrorSeverity.MEDIUM
    },
    {
      name: "CPU threshold exceeded",
      error: MockErrorGenerator.generateError({
        type: ErrorType.CPU_THRESHOLD_EXCEEDED,
        message: "CPU usage exceeded threshold"
      }),
      expectedCategory: ErrorCategory.PERFORMANCE,
      expectedType: ErrorType.CPU_THRESHOLD_EXCEEDED,
      expectedSeverity: ErrorSeverity.HIGH
    }
  ]
};

// ============================================================================
// TEST VALIDATION UTILITIES
// ============================================================================

/**
 * Test validation utilities
 */
export class TestValidator {
  /**
   * Validate error classification result
   */
  static validateClassification(
    result: ErrorAnalysis,
    expected: {
      category?: ErrorCategory;
      type?: ErrorType;
      severity?: ErrorSeverity;
    }
  ): ValidationResult {
    const issues: string[] = [];

    if (expected.category && result.category !== expected.category) {
      issues.push(`Expected category ${expected.category}, got ${result.category}`);
    }

    if (expected.type && result.type !== expected.type) {
      issues.push(`Expected type ${expected.type}, got ${result.type}`);
    }

    if (expected.severity && result.severity !== expected.severity) {
      issues.push(`Expected severity ${expected.severity}, got ${result.severity}`);
    }

    // Validate required fields
    if (!result.confidence || result.confidence < 0 || result.confidence > 1) {
      issues.push("Invalid confidence value");
    }

    if (!result.userImpact) {
      issues.push("Missing user impact assessment");
    }

    if (!result.systemImpact) {
      issues.push("Missing system impact assessment");
    }

    if (!result.recoveryStrategy) {
      issues.push("Missing recovery strategy");
    }

    return {
      valid: issues.length === 0,
      issues,
      result
    };
  }

  /**
   * Validate recovery strategy
   */
  static validateRecoveryStrategy(
    analysis: ErrorAnalysis,
    context?: Partial<ErrorContext>
  ): ValidationResult {
    const issues: string[] = [];

    // Check if recovery strategy makes sense for the error type
    const inappropriateStrategies = this.getInappropriateStrategies(analysis.type);

    if (inappropriateStrategies.includes(analysis.recoveryStrategy)) {
      issues.push(`Recovery strategy ${analysis.recoveryStrategy} is inappropriate for error type ${analysis.type}`);
    }

    // Validate success probability
    if (analysis.successProbability < 0 || analysis.successProbability > 1) {
      issues.push("Invalid success probability value");
    }

    // Validate recommended actions
    if (!analysis.recommendedActions || analysis.recommendedActions.length === 0) {
      issues.push("No recommended actions provided");
    }

    return {
      valid: issues.length === 0,
      issues,
      result: analysis
    };
  }

  /**
   * Get inappropriate recovery strategies for error type
   */
  private static getInappropriateStrategies(errorType: ErrorType): RecoveryStrategy[] {
    const inappropriate: Record<ErrorType, RecoveryStrategy[]> = {
      [ErrorType.CONNECTION_FAILURE]: [RecoveryStrategy.NO_RECOVERY],
      [ErrorType.API_RATE_LIMIT]: [RecoveryStrategy.USER_INPUT_REQUIRED],
      [ErrorType.FILE_TOO_LARGE]: [RecoveryStrategy.AUTOMATIC_RETRY],
      [ErrorType.CREDENTIALS_INVALID]: [RecoveryStrategy.AUTOMATIC_RETRY],
      [ErrorType.MEMORY_LEAK]: [RecoveryStrategy.USER_RETRY],

      // Default empty arrays for other types
      ...Object.values(ErrorType).reduce((acc, type) => {
        if (!acc[type]) acc[type] = [];
        return acc;
      }, {} as Record<ErrorType, RecoveryStrategy[]>)
    };

    return inappropriate[errorType] || [];
  }

  /**
   * Validate error pattern recognition
   */
  static validatePatternRecognition(
    errors: Array<{ error: any; analysis: ErrorAnalysis }>,
    expectedPatterns: string[]
  ): ValidationResult {
    const issues: string[] = [];
    const foundPatterns = new Set();

    for (const { analysis } of errors) {
      if (analysis.pattern) {
        foundPatterns.add(analysis.pattern);
      }
    }

    for (const expectedPattern of expectedPatterns) {
      if (!foundPatterns.has(expectedPattern)) {
        issues.push(`Expected pattern ${expectedPattern} not found`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      result: { foundPatterns: Array.from(foundPatterns), expectedPatterns }
    };
  }

  /**
   * Validate error clustering
   */
  static validateErrorClustering(
    clusters: any[],
    errors: Array<{ analysis: ErrorAnalysis }>
  ): ValidationResult {
    const issues: string[] = [];

    // Check if clusters make sense
    for (const cluster of clusters) {
      if (!cluster.id || !cluster.category || !cluster.type) {
        issues.push("Invalid cluster structure");
      }

      if (cluster.errorCount < 3) {
        issues.push(`Cluster ${cluster.id} has too few errors (${cluster.errorCount})`);
      }

      // Check if cluster members actually belong to the cluster
      const clusterErrors = errors.filter(e =>
        e.analysis.category === cluster.category && e.analysis.type === cluster.type
      );

      if (clusterErrors.length !== cluster.errorCount) {
        issues.push(`Cluster ${cluster.id} error count mismatch`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      result: clusters
    };
  }
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  issues: string[];
  result: any;
}

// ============================================================================
// PERFORMANCE TESTING UTILITIES
// ============================================================================

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  /**
   * Test classification performance
   */
  static async testClassificationPerformance(
    errorCount: number = 1000
  ): Promise<PerformanceTestResult> {
    const errors = MockErrorGenerator.generateBatch(errorCount, "diverse");

    const startTime = performance.now();

    for (const error of errors) {
      classifyError(error);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / errorCount;
    const errorsPerSecond = 1000 / averageTime;

    return {
      totalErrors: errorCount,
      totalTime,
      averageTime,
      errorsPerSecond,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Test memory usage over time
   */
  static async testMemoryUsage(
    iterations: number = 10,
    errorsPerIteration: number = 100
  ): Promise<MemoryTestResult[]> {
    const results: MemoryTestResult[] = [];

    for (let i = 0; i < iterations; i++) {
      const initialMemory = this.getMemoryUsage();

      // Generate and classify errors
      const errors = MockErrorGenerator.generateBatch(errorsPerIteration);
      for (const error of errors) {
        classifyError(error);
      }

      const finalMemory = this.getMemoryUsage();

      results.push({
        iteration: i + 1,
        errorsProcessed: errorsPerIteration,
        initialMemory,
        finalMemory,
        memoryDelta: finalMemory - initialMemory
      });

      // Small delay to allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get current memory usage (approximate)
   */
  private static getMemoryUsage(): number {
    if (typeof window !== "undefined" && "performance" in window && "memory" in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return memory.usedJSHeapSize;
    }

    // Fallback for environments without memory API
    return 0;
  }

  /**
   * Test error classification accuracy
   */
  static testClassificationAccuracy(): AccuracyTestResult {
    let totalTests = 0;
    let passedTests = 0;
    const failures: string[] = [];

    // Test all scenarios
    for (const [categoryName, scenarios] of Object.entries(TestScenarios)) {
      for (const scenario of scenarios) {
        totalTests++;

        const analysis = classifyError(scenario.error);
        const validation = TestValidator.validateClassification(analysis, {
          category: scenario.expectedCategory,
          type: scenario.expectedType,
          severity: scenario.expectedSeverity
        });

        if (validation.valid) {
          passedTests++;
        } else {
          failures.push(`${categoryName}.${scenario.name}: ${validation.issues.join(", ")}`);
        }
      }
    }

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      accuracy: (passedTests / totalTests) * 100,
      failures
    };
  }
}

/**
 * Performance test result interface
 */
interface PerformanceTestResult {
  totalErrors: number;
  totalTime: number;
  averageTime: number;
  errorsPerSecond: number;
  memoryUsage: number;
}

/**
 * Memory test result interface
 */
interface MemoryTestResult {
  iteration: number;
  errorsProcessed: number;
  initialMemory: number;
  finalMemory: number;
  memoryDelta: number;
}

/**
 * Accuracy test result interface
 */
interface AccuracyTestResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  accuracy: number;
  failures: string[];
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Comprehensive test runner for error classification system
 */
export class ErrorClassificationTestRunner {
  /**
   * Run all tests
   */
  static async runAllTests(): Promise<TestSuiteResult> {
    const startTime = Date.now();

    const results = {
      classification: this.runClassificationTests(),
      performance: await this.runPerformanceTests(),
      memory: await this.runMemoryTests(),
      accuracy: PerformanceTester.testClassificationAccuracy()
    };

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return {
      duration: totalDuration,
      results,
      summary: {
        totalTests: Object.values(results).reduce((sum, result) =>
          sum + (result.totalTests || result.totalErrors || 0), 0),
        passedTests: Object.values(results).reduce((sum, result) =>
          sum + (result.passedTests || 0), 0),
        overallSuccess: results.accuracy.accuracy > 90
      }
    };
  }

  /**
   * Run classification tests
   */
  static runClassificationTests(): ClassificationTestResult {
    const testResults: any[] = [];
    let passedTests = 0;
    let totalTests = 0;

    for (const [categoryName, scenarios] of Object.entries(TestScenarios)) {
      const categoryResults: any[] = [];

      for (const scenario of scenarios) {
        totalTests++;

        const analysis = classifyError(scenario.error);
        const validation = TestValidator.validateClassification(analysis, {
          category: scenario.expectedCategory,
          type: scenario.expectedType,
          severity: scenario.expectedSeverity
        });

        if (validation.valid) {
          passedTests++;
        }

        categoryResults.push({
          scenario: scenario.name,
          valid: validation.valid,
          issues: validation.issues,
          analysis
        });
      }

      testResults.push({
        category: categoryName,
        tests: categoryResults
      });
    }

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      results: testResults
    };
  }

  /**
   * Run performance tests
   */
  static async runPerformanceTests(): Promise<PerformanceTestResult> {
    return PerformanceTester.testClassificationPerformance(1000);
  }

  /**
   * Run memory tests
   */
  static async runMemoryTests(): Promise<MemoryTestResult[]> {
    return PerformanceTester.testMemoryUsage(5, 200);
  }
}

/**
 * Test suite result interface
 */
interface TestSuiteResult {
  duration: number;
  results: {
    classification: ClassificationTestResult;
    performance: PerformanceTestResult;
    memory: MemoryTestResult[];
    accuracy: AccuracyTestResult;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    overallSuccess: boolean;
  };
}

/**
 * Classification test result interface
 */
interface ClassificationTestResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: any[];
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Quick test function for development
 */
export function quickTest(): void {
  console.log("Running quick error classification tests...");

  const result = ErrorClassificationTestRunner.runClassificationTests();
  const accuracy = PerformanceTester.testClassificationAccuracy();

  console.log("Classification Tests:");
  console.log(`  Total: ${result.totalTests}`);
  console.log(`  Passed: ${result.passedTests}`);
  console.log(`  Failed: ${result.failedTests}`);
  console.log(`  Success Rate: ${((result.passedTests / result.totalTests) * 100).toFixed(1)}%`);

  console.log("\nAccuracy Tests:");
  console.log(`  Accuracy: ${accuracy.accuracy.toFixed(1)}%`);

  if (accuracy.failures.length > 0) {
    console.log("\nFailures:");
    accuracy.failures.slice(0, 5).forEach(failure => {
      console.log(`  - ${failure}`);
    });

    if (accuracy.failures.length > 5) {
      console.log(`  ... and ${accuracy.failures.length - 5} more`);
    }
  }
}

/**
 * Generate test report
 */
export function generateTestReport(): Promise<TestSuiteResult> {
  return ErrorClassificationTestRunner.runAllTests();
}
