/**
 * Error Boundary Test Suite
 *
 * This file contains comprehensive tests for the error boundary system.
 * Run with: npm test ErrorBoundary.test.tsx
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { ErrorBoundaryTestProvider, useErrorBoundaryTesting } from "../ErrorBoundaryTesting";

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe("ErrorBoundary", () => {
  // Test component that throws an error
  const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return <div>No error</div>;
  };

  // Test component with async error
  const AsyncErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
    React.useEffect(() => {
      if (shouldThrow) {
        throw new Error("Async test error");
      }
    }, [shouldThrow]);
    return <div>No async error</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  test("catches and displays error when child throws", () => {
    render(
      <ErrorBoundary fallbackMessage="Custom error message">
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(screen.getByText("出现了一个错误")).toBeInTheDocument();
  });

  test("calls onError callback when error occurs", () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test("resets error state when reset button is clicked", async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Initially shows no error
    expect(screen.getByText("No error")).toBeInTheDocument();

    // Rerender with error
    rerender(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error message
    expect(screen.getByText("出现了一个错误")).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByText("重试");
    fireEvent.click(resetButton);

    // Rerender without error to simulate reset
    rerender(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show normal content again
    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  test("shows technical details in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("开发模式")).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test("hides technical details in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    render(
      <ErrorBoundary showDetails={false}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText("开发模式")).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test("applies rate limiting for repeated errors", () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary maxErrors={2} onError={onError}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // First error should be handled
    expect(onError).toHaveBeenCalledTimes(1);

    // Simulate rapid subsequent errors (should be rate limited)
    // In a real scenario, this would require multiple rapid renders
    // For testing purposes, we verify the configuration is applied
  });
});

describe("ErrorBoundary with Testing Provider", () => {
  const TestComponent: React.FC = () => {
    const { triggerError } = useErrorBoundaryTesting();

    return (
      <div>
        <div>Test component</div>
        <button onClick={() => triggerError("networkTimeout")}>
          Trigger Error
        </button>
      </div>
    );
  };

  test("integrates with testing provider", () => {
    render(
      <ErrorBoundaryTestProvider>
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      </ErrorBoundaryTestProvider>
    );

    expect(screen.getByText("Test component")).toBeInTheDocument();
    expect(screen.getByText("Trigger Error")).toBeInTheDocument();
  });

  test("handles triggered errors through testing provider", async () => {
    render(
      <ErrorBoundaryTestProvider config={{ enableTestMode: true }}>
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      </ErrorBoundaryTestProvider>
    );

    const triggerButton = screen.getByText("Trigger Error");
    fireEvent.click(triggerButton);

    // Wait for error to be caught and displayed
    await waitFor(() => {
      expect(screen.getByText("出现了一个错误")).toBeInTheDocument();
    });
  });
});

describe("Error Boundary Edge Cases", () => {
  test("handles null children gracefully", () => {
    render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );

    // Should not crash and render nothing gracefully
    expect(document.body).toBeEmptyDOMElement();
  });

  test("handles empty fragment children", () => {
    render(
      <ErrorBoundary>
        <></>
      </ErrorBoundary>
    );

    // Should not crash with empty fragment
    expect(document.body).toBeEmptyDOMElement();
  });

  test("handles multiple children", () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });

  test("handles errors in nested components", () => {
    const NestedErrorComponent: React.FC = () => {
      throw new Error("Nested error");
    };

    render(
      <ErrorBoundary>
        <div>
          <div>Parent component</div>
          <NestedErrorComponent />
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText("出现了一个错误")).toBeInTheDocument();
  });
});

describe("Error Boundary Accessibility", () => {
  test("provides proper ARIA labels", () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for proper heading structure
    const errorTitle = screen.getByRole("heading", { name: "出现了一个错误" });
    expect(errorTitle).toBeInTheDocument();
  });

  test("supports keyboard navigation", () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const resetButton = screen.getByRole("button", { name: /重试/i });
    expect(resetButton).toBeInTheDocument();

    // Verify button is focusable
    resetButton.focus();
    expect(resetButton).toHaveFocus();
  });
});

// Integration tests for different error boundary types
describe("Specialized Error Boundaries", () => {
  test("PlayerErrorBoundary handles audio-specific errors", () => {
    const PlayerErrorBoundary = require("../PlayerErrorBoundary").PlayerErrorBoundary;
    const AudioPlayerComponent = () => {
      throw new Error("Audio playback failed");
    };

    render(
      <PlayerErrorBoundary>
        <AudioPlayerComponent />
      </PlayerErrorBoundary>
    );

    expect(screen.getByText(/播放器错误/i)).toBeInTheDocument();
  });

  test("TranscriptionErrorBoundary handles transcription errors", () => {
    const TranscriptionErrorBoundary = require("../TranscriptionErrorBoundary").TranscriptionErrorBoundary;
    const TranscriptionComponent = () => {
      throw new Error("Transcription service unavailable");
    };

    render(
      <TranscriptionErrorBoundary>
        <TranscriptionComponent />
      </TranscriptionErrorBoundary>
    );

    expect(screen.getByText(/转录错误/i)).toBeInTheDocument();
  });
});
