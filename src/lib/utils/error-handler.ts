/**
 * Enhanced error handling utilities for optimization features
 */

import { type ErrorType } from "@/types/transcription";

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  suggestedAction?: string;
  retryable?: boolean;
  context?: {
    fileId?: number;
    jobId?: string;
    timestamp?: Date;
    userAgent?: string;
    url?: string;
  };
}

export class TranscriptionError extends Error implements AppError {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
  suggestedAction?: string;
  retryable?: boolean;
  context?: {
    fileId?: number;
    jobId?: string;
    timestamp?: Date;
    userAgent?: string;
    url?: string;
  };

  constructor(
    message: string,
    type: ErrorType,
    options: {
      code?: string;
      statusCode?: number;
      details?: Record<string, any>;
      suggestedAction?: string;
      retryable?: boolean;
      context?: AppError["context"];
    } = {},
  ) {
    super(message);
    this.name = "TranscriptionError";
    this.type = type;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.suggestedAction = options.suggestedAction;
    this.retryable = options.retryable ?? this.getDefaultRetryable(type);
    this.context = {
      ...options.context,
      timestamp: new Date(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      url: typeof window !== "undefined" ? window.location.href : "Unknown",
    };
  }

  private getDefaultRetryable(type: ErrorType): boolean {
    const retryableTypes: ErrorType[] = [
      "network",
      "timeout",
      "rate_limit",
      "server_error",
    ];
    return retryableTypes.includes(type);
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      suggestedAction: this.suggestedAction,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: Map<ErrorType, ((error: AppError) => void)[]> =
    new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Classify and create an appropriate error
   */
  static classifyError(error: any, context?: AppError["context"]): AppError {
    const message = error?.message || String(error);
    const statusCode = error?.status || error?.statusCode;

    // Network errors
    if (
      message.includes("ECONNRESET") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ENOTFOUND") ||
      message.includes("fetch")
    ) {
      return new TranscriptionError(`Network error: ${message}`, "network", {
        statusCode: statusCode || 503,
        suggestedAction: "Check your internet connection and try again",
        context,
      });
    }

    // API Key errors
    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      statusCode === 401
    ) {
      return new TranscriptionError("Invalid or missing API key", "api_key", {
        statusCode: 401,
        suggestedAction: "Check your GROQ_API_KEY environment variable",
        retryable: false,
        context,
      });
    }

    // Rate limiting
    if (message.includes("rate limit") || statusCode === 429) {
      return new TranscriptionError("Rate limit exceeded", "rate_limit", {
        statusCode: 429,
        suggestedAction:
          "Wait before retrying or implement exponential backoff",
        retryable: true,
        context,
      });
    }

    // Quota exceeded
    if (
      message.includes("quota") ||
      message.includes("insufficient_quota") ||
      statusCode === 402
    ) {
      return new TranscriptionError("API quota exceeded", "quota_exceeded", {
        statusCode: 402,
        suggestedAction: "Check your Groq account billing and usage",
        retryable: false,
        context,
      });
    }

    // File too large
    if (
      message.includes("too large") ||
      message.includes("413") ||
      statusCode === 413
    ) {
      return new TranscriptionError(
        "Audio file size exceeds maximum limit",
        "file_too_large",
        {
          statusCode: 413,
          suggestedAction:
            "Split audio file into smaller chunks or compress the audio",
          retryable: true,
          context,
        },
      );
    }

    // Unsupported format
    if (
      message.includes("unsupported") ||
      message.includes("format") ||
      statusCode === 400
    ) {
      return new TranscriptionError(
        "Unsupported audio format",
        "unsupported_format",
        {
          statusCode: 400,
          suggestedAction:
            "Convert audio to supported format (MP3, WAV, M4A, OGG, FLAC)",
          retryable: false,
          context,
        },
      );
    }

    // Timeout errors
    if (
      message.includes("timeout") ||
      message.includes("Timeout") ||
      statusCode === 408
    ) {
      return new TranscriptionError("Request timeout", "timeout", {
        statusCode: 408,
        suggestedAction:
          "Try again with a smaller file or check your connection",
        retryable: true,
        context,
      });
    }

    // Server errors
    if (statusCode >= 500) {
      return new TranscriptionError("Server error occurred", "server_error", {
        statusCode,
        suggestedAction:
          "Try again later or contact support if the issue persists",
        retryable: true,
        context,
      });
    }

    // Unknown error
    return new TranscriptionError(
      message || "Unknown error occurred",
      "unknown",
      {
        statusCode: statusCode || 500,
        suggestedAction: "Try again or contact support if the issue persists",
        retryable: false,
        context,
      },
    );
  }

  /**
   * Handle an error with logging and callbacks
   */
  static handleError(error: AppError): void {
    // Log error details
    console.error("Transcription Error:", {
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context: error.context,
      timestamp: new Date().toISOString(),
    });

    // Trigger callbacks for this error type
    const callbacks = this.getInstance().errorCallbacks.get(error.type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(error);
        } catch (callbackError) {
          console.error("Error in error callback:", callbackError);
        }
      });
    }
  }

  /**
   * Register a callback for specific error types
   */
  static onError(
    errorType: ErrorType,
    callback: (error: AppError) => void,
  ): () => void {
    const instance = ErrorHandler.getInstance();

    if (!instance.errorCallbacks.has(errorType)) {
      instance.errorCallbacks.set(errorType, []);
    }

    instance.errorCallbacks.get(errorType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = instance.errorCallbacks.get(errorType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Create a user-friendly error message
   */
  static createUserFriendlyMessage(error: AppError): string {
    if (error.suggestedAction) {
      return `${error.message}. ${error.suggestedAction}`;
    }

    switch (error.type) {
      case "network":
        return "Connection problem. Please check your internet connection and try again.";
      case "api_key":
        return "Authentication problem. Please check your API configuration.";
      case "rate_limit":
        return "Too many requests. Please wait a moment and try again.";
      case "quota_exceeded":
        return "Service limit reached. Please check your account billing.";
      case "file_too_large":
        return "File too large. Please try with a smaller audio file.";
      case "unsupported_format":
        return "File format not supported. Please use MP3, WAV, M4A, OGG, or FLAC.";
      case "timeout":
        return "Request timed out. Please try again with a smaller file.";
      case "server_error":
        return "Service temporarily unavailable. Please try again later.";
      default:
        return "An error occurred. Please try again or contact support.";
    }
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: AppError): boolean {
    return error.retryable ?? false;
  }

  /**
   * Get retry delay for exponential backoff
   */
  static getRetryDelay(
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
  ): number {
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay + Math.random() * 1000, maxDelay); // Add jitter
  }
}

// Export AppError interface
export type { AppError };

// Export default error handler function for convenience
export function handleError(
  error: any,
  context?: AppError["context"],
): AppError {
  const appError =
    error instanceof AppError
      ? error
      : ErrorHandler.classifyError(error, context);
  ErrorHandler.handleError(appError);
  return appError;
}
