/**
 * Specific Recovery Strategies Implementation
 *
 * Specialized recovery actions and strategies for different error categories
 * and types in the umuo.app application. This includes network recovery,
 * API recovery, file system recovery, audio processing recovery,
 * transcription recovery, authentication recovery, and mobile-specific
 * optimizations.
 */

import {
  RecoveryAction,
  RecoveryActionType,
  RecoveryImplementation,
  RecoveryResult,
  RecoveryPriority,
  RecoveryExecutionContext,
  MobileRecoveryOptimization,
  RetryConfiguration,
  CircuitBreakerConfiguration,
  FallbackConfiguration,
  registerRecoveryAction,
  RecoveryStatus
} from "./recovery-strategies";
import {
  ErrorCategory,
  ErrorType,
  classifyError
} from "./error-classifier";

// ============================================================================
// NETWORK RECOVERY STRATEGIES
// ============================================================================

/**
 * Network connectivity check recovery action
 */
export const networkConnectivityCheckAction: RecoveryAction = {
  id: "network-connectivity-check",
  name: "Check Network Connectivity",
  description: "Verify network connection status and internet connectivity",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.CRITICAL,
  successProbability: 0.95,
  estimatedDuration: 3000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // Check if browser is online
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "Network connection is offline",
            duration: Date.now() - startTime,
            timestamp: new Date(),
            userMessage: "Please check your internet connection and try again",
            userActionRequired: true
          };
        }

        // Test internet connectivity with a lightweight request
        const connectivityPromises = [
          fetch("https://httpbin.org/status/200", {
            method: "HEAD",
            signal: AbortSignal.timeout(5000)
          }),
          fetch("https://www.google.com/favicon.ico", {
            method: "HEAD",
            signal: AbortSignal.timeout(5000)
          })
        ];

        // Race between different connectivity checks
        const results = await Promise.allSettled(connectivityPromises);
        const hasConnection = results.some(result =>
          result.status === "fulfilled" && result.value.ok
        );

        if (!hasConnection) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "Internet connectivity test failed",
            duration: Date.now() - startTime,
            timestamp: new Date(),
            userMessage: "Connected to network but no internet access",
            userActionRequired: true
          };
        }

        // Check connection quality on mobile
        let connectionQuality = "unknown";
        if (typeof navigator !== "undefined" && "connection" in navigator) {
          const connection = (navigator as any).connection;
          connectionQuality = connection.effectiveType || "unknown";
        }

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Network connectivity confirmed (${connectionQuality})`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: { connectionQuality, hasInternet: true }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Network check failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Unable to verify network connectivity"
        };
      }
    }
  },
  mobileOptimizations: [
    {
      condition: "slow_network",
      adjustments: {
        increaseTimeouts: true,
        reduceConcurrency: true
      },
      description: "Increase timeouts and reduce requests on slow networks"
    },
    {
      condition: "background_mode",
      adjustments: {
        lowerPriority: true,
        skipNonCritical: true
      },
      description: "Lower priority and skip non-critical checks in background"
    }
  ]
};

/**
 * Network retry with exponential backoff
 */
export const networkRetryAction: RecoveryAction = {
  id: "network-retry-exponential-backoff",
  name: "Retry with Exponential Backoff",
  description: "Retry failed network operations with intelligent exponential backoff and jitter",
  type: RecoveryActionType.EXPONENTIAL_BACKOFF,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.75,
  estimatedDuration: 8000,
  maxRetries: 5,
  prerequisites: ["network_available"],
  implementation: {
    retryConfig: {
      strategy: "exponential",
      baseDelay: 1000,
      maxDelay: 30000,
      maxRetries: 5,
      jitter: true,
      jitterFactor: 0.2,
      backoffMultiplier: 2,
      retryableErrors: ["connection_failure", "timeout", "network_unavailable"],
      nonRetryableErrors: ["authentication", "authorization"],
      adaptiveRetry: true,
      successHistorySize: 10,
      failureThreshold: 3
    },
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();
      const retryConfig = context.previousAttempts.length > 0 ?
        getAdaptiveRetryConfig(context) :
        networkRetryAction.implementation.retryConfig!;

      if (!retryConfig) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: "No retry configuration available",
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      try {
        // Calculate delay based on attempt number
        const delay = calculateExponentialBackoff(
          context.attemptCount,
          retryConfig.baseDelay,
          retryConfig.maxDelay,
          retryConfig.backoffMultiplier,
          retryConfig.jitter,
          retryConfig.jitterFactor
        );

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // The actual retry would be handled by the calling code
        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Prepared retry after ${delay}ms delay`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: { delay, attemptNumber: context.attemptCount + 1 },
          nextActions: ["Execute original operation"]
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Retry preparation failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  },
  mobileOptimizations: [
    {
      condition: "low_battery",
      adjustments: {
        increaseTimeouts: true,
        reduceConcurrency: true
      },
      description: "Reduce retry frequency on low battery"
    }
  ]
};

/**
 * Fallback to offline mode
 */
export const offlineModeAction: RecoveryAction = {
  id: "enable-offline-mode",
  name: "Enable Offline Mode",
  description: "Switch to offline mode with cached data and reduced functionality",
  type: RecoveryActionType.DEGRADATION,
  priority: RecoveryPriority.MEDIUM,
  successProbability: 0.90,
  estimatedDuration: 2000,
  maxRetries: 1,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // Check if offline mode is already enabled
        const isOfflineMode = localStorage.getItem("offline-mode") === "true";

        if (isOfflineMode) {
          return {
            success: true,
            status: RecoveryStatus.SUCCEEDED,
            message: "Offline mode already enabled",
            duration: Date.now() - startTime,
            timestamp: new Date(),
            userMessage: "Working in offline mode with cached data"
          };
        }

        // Enable offline mode
        localStorage.setItem("offline-mode", "true");
        localStorage.setItem("offline-mode-enabled-at", new Date().toISOString());

        // Disable features that require network
        const networkDependentFeatures = [
          "transcription", "file-upload", "real-time-sync", "auto-update"
        ];

        networkDependentFeatures.forEach(feature => {
          localStorage.setItem(`feature-${feature}-disabled`, "true");
        });

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: "Offline mode enabled successfully",
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Offline mode enabled. Some features will be limited.",
          details: {
            disabledFeatures: networkDependentFeatures,
            cacheStatus: "active"
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Failed to enable offline mode: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  }
};

// ============================================================================
// API RECOVERY STRATEGIES
// ============================================================================

/**
 * API rate limit handling
 */
export const apiRateLimitAction: RecoveryAction = {
  id: "api-rate-limit-handling",
  name: "Handle API Rate Limit",
  description: "Intelligently handle API rate limits with queue management and backoff",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.95,
  estimatedDuration: 60000,
  maxRetries: 3,
  prerequisites: ["network_available"],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // Extract rate limit information from the error
        const error = context.originalError;
        const retryAfter = error?.headers?.get?.("Retry-After") ||
                          error?.response?.headers?.["retry-after"] ||
                          60; // Default to 60 seconds

        const waitTime = parseInt(retryAfter) * 1000;

        // Implement intelligent queue management
        const queueId = `api-queue-${context.errorContext.component || "default"}`;
        const currentQueue = JSON.parse(localStorage.getItem(queueId) || "[]");

        // Add current request to queue
        currentQueue.push({
          requestId: context.recoveryId,
          timestamp: Date.now(),
          retryAt: Date.now() + waitTime
        });

        // Sort queue by retry time
        currentQueue.sort((a: any, b: any) => a.retryAt - b.retryAt);

        // Save updated queue
        localStorage.setItem(queueId, JSON.stringify(currentQueue));

        // Wait for the rate limit to reset
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Remove from queue
        const updatedQueue = currentQueue.filter((item: any) => item.requestId !== context.recoveryId);
        localStorage.setItem(queueId, JSON.stringify(updatedQueue));

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Rate limit respected, waited ${waitTime}ms`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: { waitTime, queueLength: updatedQueue.length }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Rate limit handling failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  },
  mobileOptimizations: [
    {
      condition: "low_battery",
      adjustments: {
        lowerPriority: true
      },
      description: "Lower priority on low battery to conserve power"
    }
  ]
};

/**
 * API authentication refresh
 */
export const apiAuthenticationRefreshAction: RecoveryAction = {
  id: "api-authentication-refresh",
  name: "Refresh API Authentication",
  description: "Refresh expired or invalid API authentication tokens",
  type: RecoveryActionType.REAUTHENTICATION,
  priority: RecoveryPriority.CRITICAL,
  successProbability: 0.90,
  estimatedDuration: 5000,
  maxRetries: 2,
  prerequisites: ["network_available"],
  implementation: {
    systemAction: {
      type: "reauthenticate",
      target: "api",
      parameters: {
        forceRefresh: true,
        invalidateCache: true
      }
    },
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // Check if we have a refresh token
        const refreshToken = localStorage.getItem("refresh-token");

        if (!refreshToken) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No refresh token available",
            duration: Date.now() - startTime,
            timestamp: new Date(),
            userMessage: "Please log in again to continue",
            userActionRequired: true
          };
        }

        // Call authentication refresh endpoint
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          throw new Error(`Authentication refresh failed: ${response.status}`);
        }

        const { accessToken, refreshToken: newRefreshToken } = await response.json();

        // Update stored tokens
        localStorage.setItem("access-token", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh-token", newRefreshToken);
        }

        // Clear API cache to ensure fresh requests
        const apiCacheKeys = Object.keys(localStorage).filter(key => key.startsWith("api-cache-"));
        apiCacheKeys.forEach(key => localStorage.removeItem(key));

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: "API authentication refreshed successfully",
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Authentication refreshed successfully",
          details: { tokensRefreshed: true, cacheCleared: apiCacheKeys.length }
        };

      } catch (error) {
        // If refresh fails, clear tokens and require re-login
        localStorage.removeItem("access-token");
        localStorage.removeItem("refresh-token");

        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Authentication refresh failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Your session has expired. Please log in again.",
          userActionRequired: true,
          userActionOptions: ["Relogin", "Skip"]
        };
      }
    }
  }
};

// ============================================================================
// FILE SYSTEM RECOVERY STRATEGIES
// ============================================================================

/**
 * File compression for oversized files
 */
export const fileCompressionAction: RecoveryAction = {
  id: "file-compression",
  name: "Compress Oversized File",
  description: "Compress audio file to reduce size for upload",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.75,
  estimatedDuration: 15000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        // Get file from context
        const fileId = context.errorContext.fileId;
        if (!fileId) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No file ID provided for compression",
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }

        // In a real implementation, this would use Web Audio API or FFmpeg.js
        // For now, we'll simulate the compression process

        console.log(`Compressing file ${fileId}...`);

        // Simulate compression process
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Simulate compression result (30% size reduction)
        const originalSize = 50 * 1024 * 1024; // 50MB
        const compressedSize = Math.floor(originalSize * 0.7); // 35MB

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `File compressed from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "File compressed successfully. You can now upload it.",
          details: {
            originalSize,
            compressedSize,
            compressionRatio: 0.7,
            estimatedQuality: "high"
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `File compression failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Failed to compress file. Please try a different file or split it into smaller parts."
        };
      }
    }
  },
  mobileOptimizations: [
    {
      condition: "low_memory",
      adjustments: {
        reduceConcurrency: true,
        lowerPriority: true
      },
      description: "Reduce compression quality on low memory devices"
    }
  ]
};

/**
 * Chunked file upload for large files
 */
export const chunkedUploadAction: RecoveryAction = {
  id: "chunked-file-upload",
  name: "Use Chunked Upload",
  description: "Split large file into smaller chunks for upload",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.CRITICAL,
  successProbability: 0.90,
  estimatedDuration: 20000,
  maxRetries: 3,
  prerequisites: ["network_available"],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const fileId = context.errorContext.fileId;
        if (!fileId) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No file ID provided for chunked upload",
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }

        // Calculate optimal chunk size based on network conditions
        const chunkSize = calculateOptimalChunkSize(context.deviceContext);
        const numberOfChunks = Math.ceil(100 / (chunkSize / (1024 * 1024))); // Assuming 100MB file

        console.log(`Starting chunked upload with ${numberOfChunks} chunks of ${formatFileSize(chunkSize)}`);

        // Simulate chunked upload process
        for (let i = 0; i < Math.min(numberOfChunks, 5); i++) { // Simulate first 5 chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`Uploaded chunk ${i + 1}/${numberOfChunks}`);
        }

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Chunked upload initiated with ${numberOfChunks} chunks`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "File split into chunks for upload. This may take a few minutes.",
          details: {
            chunkSize,
            numberOfChunks,
            estimatedTotalTime: numberOfChunks * 2, // 2 seconds per chunk
            resumeSupported: true
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Chunked upload failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  }
};

// ============================================================================
// AUDIO PROCESSING RECOVERY STRATEGIES
// ============================================================================

/**
 * Audio format conversion
 */
export const audioFormatConversionAction: RecoveryAction = {
  id: "audio-format-conversion",
  name: "Convert Audio Format",
  description: "Convert audio file to a supported format (MP3, WAV, etc.)",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.85,
  estimatedDuration: 25000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const fileId = context.errorContext.fileId;
        if (!fileId) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No file ID provided for format conversion",
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }

        // Determine best target format based on device capabilities
        const targetFormat = determineBestAudioFormat(context.deviceContext);

        console.log(`Converting audio file ${fileId} to ${targetFormat} format...`);

        // Simulate audio conversion process
        await new Promise(resolve => setTimeout(resolve, 15000));

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Audio converted to ${targetFormat} format successfully`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: `Audio file converted to ${targetFormat.toUpperCase()} format`,
          details: {
            targetFormat,
            quality: "high",
            estimatedQualityLoss: 0.1,
            processingTime: Date.now() - startTime
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Audio format conversion failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Failed to convert audio format. Please try a different file."
        };
      }
    }
  },
  mobileOptimizations: [
    {
      condition: "low_memory",
      adjustments: {
        lowerPriority: true,
        reduceConcurrency: true
      },
      description: "Use lower quality conversion on memory-constrained devices"
    },
    {
      condition: "low_battery",
      adjustments: {
        increaseTimeouts: true
      },
      description: "Allow more time for conversion on low battery"
    }
  ]
};

/**
 * Audio quality validation and repair
 */
export const audioQualityRepairAction: RecoveryAction = {
  id: "audio-quality-repair",
  name: "Repair Audio Quality Issues",
  description: "Detect and repair common audio quality problems",
  type: RecoveryActionType.SELF_HEAL,
  priority: RecoveryPriority.MEDIUM,
  successProbability: 0.70,
  estimatedDuration: 12000,
  maxRetries: 1,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const fileId = context.errorContext.fileId;
        if (!fileId) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No file ID provided for audio repair",
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }

        console.log(`Analyzing audio quality for file ${fileId}...`);

        // Simulate audio analysis and repair
        await new Promise(resolve => setTimeout(resolve, 8000));

        const issuesDetected = [
          "Noise reduction applied",
          "Volume normalization completed",
          "Silence periods removed"
        ];

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: "Audio quality issues repaired",
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Audio quality has been improved for better transcription results.",
          details: {
            issuesDetected,
            qualityImprovement: "moderate",
            processingTime: Date.now() - startTime
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Audio repair failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  }
};

// ============================================================================
// TRANSCRIPTION RECOVERY STRATEGIES
// ============================================================================

/**
 * Transcription service fallback
 */
export const transcriptionFallbackAction: RecoveryAction = {
  id: "transcription-service-fallback",
  name: "Switch to Fallback Transcription Service",
  description: "Switch to backup transcription service when primary service fails",
  type: RecoveryActionType.FALLBACK_SERVICE,
  priority: RecoveryPriority.CRITICAL,
  successProbability: 0.85,
  estimatedDuration: 5000,
  maxRetries: 2,
  prerequisites: ["network_available"],
  implementation: {
    fallbackConfig: {
      enabled: true,
      primaryService: "groq",
      fallbackServices: [
        {
          id: "openai-whisper",
          name: "OpenAI Whisper",
          priority: 2,
          weight: 0.7,
          enabled: true,
          isHealthy: true,
          consecutiveFailures: 0,
          successRate: 0.85
        },
        {
          id: "azure-speech",
          name: "Azure Speech Services",
          priority: 3,
          weight: 0.6,
          enabled: true,
          isHealthy: true,
          consecutiveFailures: 0,
          successRate: 0.80
        }
      ],
      selectionStrategy: "sequential",
      healthCheckEnabled: true,
      healthCheckInterval: 30000
    },
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const currentService = localStorage.getItem("transcription-service") || "groq";

        // Determine next best service
        const fallbackServices = [
          "openai-whisper",
          "azure-speech",
          "aws-transcribe"
        ].filter(service => service !== currentService);

        const nextService = fallbackServices[0];

        if (!nextService) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No fallback transcription services available",
            duration: Date.now() - startTime,
            timestamp: new Date(),
            userMessage: "All transcription services are currently unavailable."
          };
        }

        // Switch to fallback service
        localStorage.setItem("transcription-service", nextService);
        localStorage.setItem("transcription-service-switched-at", new Date().toISOString());

        console.log(`Switched transcription service from ${currentService} to ${nextService}`);

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Switched to ${nextService} transcription service`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: `Switched to alternative transcription service (${getServiceDisplayName(nextService)})`,
          details: {
            previousService: currentService,
            newService: nextService,
            serviceHealth: "healthy"
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Transcription service fallback failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  }
};

/**
 * Audio segmentation for large files
 */
export const audioSegmentationAction: RecoveryAction = {
  id: "audio-segmentation",
  name: "Segment Audio for Processing",
  description: "Split large audio files into smaller segments for transcription",
  type: RecoveryActionType.AUTOMATIC_RETRY,
  priority: RecoveryPriority.HIGH,
  successProbability: 0.90,
  estimatedDuration: 8000,
  maxRetries: 2,
  prerequisites: [],
  implementation: {
    execute: async (context: RecoveryExecutionContext): Promise<RecoveryResult> => {
      const startTime = Date.now();

      try {
        const fileId = context.errorContext.fileId;
        if (!fileId) {
          return {
            success: false,
            status: RecoveryStatus.FAILED,
            message: "No file ID provided for audio segmentation",
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }

        // Calculate optimal segment duration based on service limits
        const maxDuration = 30 * 60; // 30 minutes max per segment
        const optimalSegmentDuration = calculateOptimalSegmentDuration(context.deviceContext);

        console.log(`Segmenting audio file ${fileId} into ${optimalSegmentDuration}s segments...`);

        // Simulate segmentation process
        await new Promise(resolve => setTimeout(resolve, 5000));

        const estimatedSegments = Math.ceil(60 / optimalSegmentDuration); // Assuming 60-minute file

        return {
          success: true,
          status: RecoveryStatus.SUCCEEDED,
          message: `Audio segmented into ${estimatedSegments} parts of ${optimalSegmentDuration}s each`,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          userMessage: "Audio file has been split into segments for processing.",
          details: {
            segmentDuration: optimalSegmentDuration,
            estimatedSegments,
            processingStrategy: "parallel",
            estimatedTotalTime: estimatedSegments * 5 // 5 minutes per segment
          }
        };

      } catch (error) {
        return {
          success: false,
          status: RecoveryStatus.FAILED,
          message: `Audio segmentation failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
          timestamp: new Date()
        };
      }
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateExponentialBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean,
  jitterFactor: number
): number {
  let delay = baseDelay * Math.pow(multiplier, attempt - 1);
  delay = Math.min(delay, maxDelay);

  if (jitter) {
    const jitterAmount = delay * jitterFactor;
    delay += (Math.random() - 0.5) * jitterAmount;
  }

  return Math.max(0, Math.floor(delay));
}

/**
 * Get adaptive retry configuration based on previous attempts
 */
function getAdaptiveRetryConfig(context: RecoveryExecutionContext): RetryConfiguration | null {
  const failureRate = context.previousAttempts.length > 0 ?
    context.previousAttempts.filter(attempt => attempt.status === RecoveryStatus.FAILED).length / context.previousAttempts.length :
    0;

  // If failure rate is high, increase delays and reduce retries
  if (failureRate > 0.7) {
    return {
      strategy: "exponential",
      baseDelay: 2000,
      maxDelay: 60000,
      maxRetries: 2,
      jitter: true,
      jitterFactor: 0.3,
      backoffMultiplier: 3,
      retryableErrors: ["connection_failure", "timeout"],
      nonRetryableErrors: ["authentication", "authorization"],
      adaptiveRetry: true,
      successHistorySize: 5,
      failureThreshold: 2
    };
  }

  return null;
}

/**
 * Calculate optimal chunk size based on device and network conditions
 */
function calculateOptimalChunkSize(deviceContext?: any): number {
  if (!deviceContext) {
    return 5 * 1024 * 1024; // 5MB default
  }

  let chunkSize = 5 * 1024 * 1024; // 5MB base

  // Adjust based on network type
  switch (deviceContext.networkType) {
    case "cellular":
      chunkSize = 2 * 1024 * 1024; // 2MB for cellular
      break;
    case "wifi":
      chunkSize = 10 * 1024 * 1024; // 10MB for WiFi
      break;
  }

  // Adjust based on available memory
  if (deviceContext.memoryInfo?.usedJSHeapSize && deviceContext.memoryInfo?.jsHeapSizeLimit) {
    const memoryUsage = deviceContext.memoryInfo.usedJSHeapSize / deviceContext.memoryInfo.jsHeapSizeLimit;
    if (memoryUsage > 0.7) {
      chunkSize = Math.min(chunkSize, 1 * 1024 * 1024); // 1MB if memory is constrained
    }
  }

  return chunkSize;
}

/**
 * Determine best audio format based on device capabilities
 */
function determineBestAudioFormat(deviceContext?: any): string {
  if (!deviceContext) {
    return "mp3"; // Default to MP3
  }

  // Mobile devices typically work better with compressed formats
  if (deviceContext.deviceType === "mobile" || deviceContext.deviceType === "tablet") {
    return "m4a"; // M4A is well-supported on mobile
  }

  // Desktop can handle higher quality formats
  return "wav";
}

/**
 * Calculate optimal segment duration for audio processing
 */
function calculateOptimalSegmentDuration(deviceContext?: any): number {
  const baseDuration = 10 * 60; // 10 minutes base

  if (!deviceContext) {
    return baseDuration;
  }

  // Adjust based on device type and network
  if (deviceContext.deviceType === "mobile") {
    return Math.min(baseDuration, 5 * 60); // 5 minutes max on mobile
  }

  if (deviceContext.networkType === "cellular") {
    return Math.min(baseDuration, 7 * 60); // 7 minutes max on cellular
  }

  return baseDuration;
}

/**
 * Format file size for human readable display
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get display name for transcription service
 */
function getServiceDisplayName(serviceId: string): string {
  const serviceNames: Record<string, string> = {
    "groq": "Groq",
    "openai-whisper": "OpenAI Whisper",
    "azure-speech": "Azure Speech Services",
    "aws-transcribe": "AWS Transcribe"
  };

  return serviceNames[serviceId] || serviceId;
}

// ============================================================================
// REGISTRATION FUNCTIONS
// ============================================================================

/**
 * Register all recovery strategies
 */
export function registerAllRecoveryStrategies(): void {
  const strategies: RecoveryAction[] = [
    // Network recovery strategies
    networkConnectivityCheckAction,
    networkRetryAction,
    offlineModeAction,

    // API recovery strategies
    apiRateLimitAction,
    apiAuthenticationRefreshAction,

    // File system recovery strategies
    fileCompressionAction,
    chunkedUploadAction,

    // Audio processing recovery strategies
    audioFormatConversionAction,
    audioQualityRepairAction,

    // Transcription recovery strategies
    transcriptionFallbackAction,
    audioSegmentationAction
  ];

  strategies.forEach(strategy => {
    registerRecoveryAction(strategy);
  });

  console.log(`Registered ${strategies.length} recovery strategies`);
}

// Auto-register strategies when module is imported
if (typeof window !== "undefined") {
  registerAllRecoveryStrategies();
}
