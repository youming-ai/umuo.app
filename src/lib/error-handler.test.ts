import {
  LogLevel,
  setErrorMonitor,
  getErrorMonitor,
  createError,
  logError,
  isAppError,
  handleError,
  handleSilently,
  showErrorToast,
  showSuccessToast,
  validationError,
  notFoundError,
  internalError,
  type ErrorLogEntry,
  type ExtendedErrorMonitor,
} from "./error-handler";
import { ErrorCodes, ErrorCategory, ErrorSeverity } from "@/types/errors";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { toast } from "sonner";

describe("Error Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset error monitor
    setErrorMonitor(null as any);
  });

  describe("Error Monitor", () => {
    test("should set and get error monitor", () => {
      const mockMonitor: ExtendedErrorMonitor = {
        logError: jest.fn(),
        logInfo: jest.fn(),
        logWarning: jest.fn(),
      };

      setErrorMonitor(mockMonitor);
      expect(getErrorMonitor()).toBe(mockMonitor);
    });

    test("should return null when no monitor is set", () => {
      expect(getErrorMonitor()).toBeNull();
    });
  });

  describe("createError", () => {
    test("should create error with basic properties", () => {
      const error = createError("apiValidationError", "Test error");

      expect(error.code).toBe(ErrorCodes.apiValidationError);
      expect(error.message).toBe("Test error");
      expect(error.timestamp).toBeInstanceOf(Number);
      expect(error.context).toBeDefined();
    });

    test("should create error with details", () => {
      const details = { field: "email", value: "invalid" };
      const error = createError("apiValidationError", "Test error", details);

      expect(error.details).toEqual(details);
    });

    test("should create error with context", () => {
      const context = { component: "test", action: "create" };
      const error = createError("apiValidationError", "Test error", undefined, 400, context);

      expect(error.context).toEqual(
        expect.objectContaining({
          ...context,
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe("logError", () => {
    test("should log error to monitor", () => {
      const mockMonitor: ExtendedErrorMonitor = {
        logError: jest.fn(),
        logInfo: jest.fn(),
        logWarning: jest.fn(),
      };

      setErrorMonitor(mockMonitor);

      const error = createError("apiValidationError", "Test error");

      logError(error, "Test context");

      expect(mockMonitor.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          component: "Test context",
        }),
      );
    });

    test("should not log when no monitor is set", () => {
      const error = createError("apiValidationError", "Test error");

      expect(() => logError(error)).not.toThrow();
    });
  });

  describe("isAppError", () => {
    test("should return true for AppError", () => {
      const error = createError("apiValidationError", "Test error");

      expect(isAppError(error)).toBe(true);
    });

    test("should return false for regular Error", () => {
      const error = new Error("Regular error");
      expect(isAppError(error)).toBe(false);
    });

    test("should return false for non-error objects", () => {
      expect(isAppError("string")).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe("handleError", () => {
    test("should handle AppError", () => {
      const error = createError("apiValidationError", "Test error");

      const handled = handleError(error);
      expect(handled).toBe(error);
    });

    test("should convert regular Error to AppError", () => {
      const error = new Error("Regular error");
      const handled = handleError(error);

      expect(isAppError(handled)).toBe(true);
      expect(handled.message).toBe("Regular error");
      expect(handled.code).toBe(ErrorCodes.internalServerError);
    });

    test("should handle string error", () => {
      const handled = handleError("String error");

      expect(isAppError(handled)).toBe(true);
      expect(handled.message).toBe("String error");
      expect(handled.code).toBe(ErrorCodes.internalServerError);
    });

    test("should handle unknown error type", () => {
      const handled = handleError(null);

      expect(isAppError(handled)).toBe(true);
      expect(handled.message).toBe("未知错误");
      expect(handled.code).toBe(ErrorCodes.internalServerError);
    });

    test("should log error with context", () => {
      const mockMonitor: ExtendedErrorMonitor = {
        logError: jest.fn(),
        logInfo: jest.fn(),
        logWarning: jest.fn(),
      };

      setErrorMonitor(mockMonitor);

      const error = createError("apiValidationError", "Test error");

      handleError(error, "Test context");
      expect(mockMonitor.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          component: "Test context",
        }),
      );
    });
  });

  describe("handleSilently", () => {
    test("should handle error without logging", () => {
      const mockMonitor: ExtendedErrorMonitor = {
        logError: jest.fn(),
        logInfo: jest.fn(),
        logWarning: jest.fn(),
      };

      setErrorMonitor(mockMonitor);

      const error = createError("apiValidationError", "Test error");

      const handled = handleSilently(error, "Test context");
      expect(mockMonitor.logError).not.toHaveBeenCalled();
      expect(isAppError(handled)).toBe(true);
    });
  });

  describe("Toast Functions", () => {
    test("should show error toast for AppError", () => {
      const error = createError("apiValidationError", "Test error");

      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Test error");
    });

    test("should show error toast for regular error", () => {
      const error = new Error("Regular error");
      showErrorToast(error);
      expect(toast.error).toHaveBeenCalledWith("Regular error");
    });

    test("should show error toast for string", () => {
      showErrorToast("String error");
      expect(toast.error).toHaveBeenCalledWith("String error");
    });

    test("should show success toast", () => {
      showSuccessToast("Success message");
      expect(toast.success).toHaveBeenCalledWith("Success message");
    });
  });

  describe("Convenience Error Functions", () => {
    test("should create validation error", () => {
      const error = validationError("Validation failed", { field: "email" });
      expect(error.code).toBe(ErrorCodes.apiValidationError);
      expect(error.message).toBe("Validation failed");
      expect(error.details).toEqual({ field: "email" });
    });

    test("should create not found error", () => {
      const error = notFoundError("Resource not found", { resource: "user" });
      expect(error.code).toBe(ErrorCodes.fileNotFound);
      expect(error.message).toBe("Resource not found");
      expect(error.details).toEqual({ resource: "user" });
    });

    test("should create internal error", () => {
      const error = internalError("Internal server error", { component: "database" });
      expect(error.code).toBe(ErrorCodes.internalServerError);
      expect(error.message).toBe("Internal server error");
      expect(error.details).toEqual({ component: "database" });
    });
  });

  describe("LogLevel Enum", () => {
    test("should have correct log levels", () => {
      expect(LogLevel.ERROR).toBe("error");
      expect(LogLevel.WARN).toBe("warn");
      expect(LogLevel.INFO).toBe("info");
      expect(LogLevel.DEBUG).toBe("debug");
    });
  });
});
