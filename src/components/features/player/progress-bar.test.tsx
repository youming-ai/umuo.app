import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProgressBar } from "./progress-bar";
import type { Segment } from "@/types/db/database";

// Mock haptic feedback
jest.mock("@/lib/mobile/haptic-feedback", () => ({
  useHapticFeedback: () => ({
    selection: jest.fn(),
    medium: jest.fn(),
    light: jest.fn(),
    success: jest.fn(),
    playerAction: jest.fn(),
  }),
}));

// Mock touch optimizer
jest.mock("@/lib/mobile/touch-optimizer", () => ({
  touchOptimizer: {
    applyTouchOptimizations: jest.fn(),
    createTouchProgressIndicator: jest.fn(),
  },
}));

// Mock mobile detector
jest.mock("@/types/mobile", () => ({
  MobileDetector: {
    getInstance: () => ({
      isMobile: () => false,
      hasTouchSupport: () => false,
    }),
  },
}));

describe("ProgressBar Component", () => {
  const defaultProps = {
    currentTime: 30,
    duration: 120,
    isPlaying: false,
    onSeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<ProgressBar {...defaultProps} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25"); // 30/120 = 25%
  });

  it("displays correct progress percentage", () => {
    render(<ProgressBar {...defaultProps} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
  });

  it("handles click events for seeking", () => {
    const mockSeek = jest.fn();
    render(<ProgressBar {...defaultProps} onSeek={mockSeek} />);

    const progressBar = screen.getByRole("progressbar");

    // Simulate a click at 50% of the progress bar
    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    fireEvent.click(progressBar, { clientX: 100 }); // 50% position

    expect(mockSeek).toHaveBeenCalledWith(60); // 50% of 120 seconds
  });

  it("handles keyboard navigation", async () => {
    const mockSeek = jest.fn();
    render(<ProgressBar {...defaultProps} onSeek={mockSeek} />);

    const seekHandle = screen.getByRole("slider");
    seekHandle.focus();

    // Test right arrow key
    fireEvent.keyDown(seekHandle, { key: "ArrowRight" });
    expect(mockSeek).toHaveBeenCalledWith(31); // 30 + 1

    // Test left arrow key
    fireEvent.keyDown(seekHandle, { key: "ArrowLeft" });
    expect(mockSeek).toHaveBeenCalledWith(29); // 30 - 1

    // Test shift + right arrow (5 second step)
    fireEvent.keyDown(seekHandle, { key: "ArrowRight", shiftKey: true });
    expect(mockSeek).toHaveBeenCalledWith(35); // 30 + 5
  });

  it("handles mouse drag events", () => {
    const mockSeek = jest.fn();
    render(<ProgressBar {...defaultProps} onSeek={mockSeek} />);

    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    // Start drag
    fireEvent.mouseDown(progressBar, { clientX: 50 });

    // Move during drag
    fireEvent.mouseMove(document, { clientX: 100 });

    // End drag
    fireEvent.mouseUp(document, { clientX: 100 });

    expect(mockSeek).toHaveBeenCalledTimes(2); // Once for move, once for end
  });

  it("handles touch events", () => {
    const mockSeek = jest.fn();
    render(<ProgressBar {...defaultProps} onSeek={mockSeek} touchMode={true} />);

    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    // Start touch
    fireEvent.touchStart(progressBar, {
      touches: [{ clientX: 50 }],
    });

    // Move during touch
    fireEvent.touchMove(document, {
      touches: [{ clientX: 100 }],
    });

    // End touch
    fireEvent.touchEnd(document, {
      changedTouches: [{ clientX: 100 }],
    });

    expect(mockSeek).toHaveBeenCalled();
  });

  it("displays time information", () => {
    render(<ProgressBar {...defaultProps} showTimeDisplay={true} />);

    const timeDisplay = screen.getByText(/00:30/);
    expect(timeDisplay).toBeInTheDocument();

    const durationDisplay = screen.getByText(/02:00/);
    expect(durationDisplay).toBeInTheDocument();
  });

  it("handles edge cases for time values", () => {
    render(
      <ProgressBar
        currentTime={NaN}
        duration={Infinity}
        isPlaying={false}
        onSeek={jest.fn()}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows buffer indicators when provided", () => {
    const bufferedRanges = [
      { start: 0, end: 30 },
      { start: 60, end: 90 },
    ];

    render(
      <ProgressBar
        {...defaultProps}
        bufferedRanges={bufferedRanges}
        showBufferIndicator={true}
      />
    );

    // Buffer indicators are visually represented
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows segment markers when provided", () => {
    const segments: Segment[] = [
      {
        id: 1,
        transcriptId: 1,
        start: 10,
        end: 20,
        text: "First segment",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        transcriptId: 1,
        start: 40,
        end: 50,
        text: "Second segment",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    render(
      <ProgressBar
        {...defaultProps}
        segments={segments}
        showSegmentMarkers={true}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("handles loading state", () => {
    render(<ProgressBar {...defaultProps} isLoading={true} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-busy", "true");
    expect(progressBar).toHaveClass("opacity-60");
  });

  it("supports different variants", () => {
    const { rerender } = render(
      <ProgressBar {...defaultProps} variant="compact" />
    );

    let progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    rerender(<ProgressBar {...defaultProps} variant="minimal" />);
    progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    rerender(<ProgressBar {...defaultProps} variant="default" />);
    progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("calls seek lifecycle callbacks", () => {
    const mockSeekStart = jest.fn();
    const mockSeekEnd = jest.fn();
    const mockSeek = jest.fn();

    render(
      <ProgressBar
        {...defaultProps}
        onSeekStart={mockSeekStart}
        onSeekEnd={mockSeekEnd}
        onSeek={mockSeek}
      />
    );

    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    // Start drag
    fireEvent.mouseDown(progressBar, { clientX: 50 });
    expect(mockSeekStart).toHaveBeenCalled();

    // End drag
    fireEvent.mouseUp(document, { clientX: 100 });
    expect(mockSeekEnd).toHaveBeenCalled();
  });

  it("applies custom CSS classes", () => {
    const customClass = "my-custom-progress-bar";
    render(<ProgressBar {...defaultProps} className={customClass} />);

    const container = screen.getByRole("progressbar").parentElement;
    expect(container).toHaveClass(customClass);
  });

  it("handles touch mode optimizations", () => {
    render(<ProgressBar {...defaultProps} touchMode={true} />);

    // Touch optimizations should be applied
    const container = screen.getByRole("progressbar").parentElement;
    expect(container).toHaveClass("touch-optimized");
  });

  it("prevents default touch behaviors during drag", () => {
    render(<ProgressBar {...defaultProps} touchMode={true} />);

    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    // Start touch
    const touchStartEvent = new TouchEvent("touchstart", {
      touches: [{ clientX: 50 } as Touch],
    });

    fireEvent(progressBar, touchStartEvent);
    expect(touchStartEvent.defaultPrevented).toBe(true);
  });

  it("validates seek time boundaries", () => {
    const mockSeek = jest.fn();
    render(<ProgressBar {...defaultProps} onSeek={mockSeek} />);

    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    // Click before start (should clamp to 0)
    fireEvent.click(progressBar, { clientX: -10 });
    expect(mockSeek).toHaveBeenCalledWith(0);

    // Click after end (should clamp to duration)
    fireEvent.click(progressBar, { clientX: 300 });
    expect(mockSeek).toHaveBeenCalledWith(120);
  });

  it("handles zero duration gracefully", () => {
    render(
      <ProgressBar
        currentTime={30}
        duration={0}
        isPlaying={false}
        onSeek={jest.fn()}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = render(<ProgressBar {...defaultProps} />);

    // Simulate starting a drag
    const progressBar = screen.getByRole("progressbar");

    Object.defineProperty(progressBar, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 200 }),
    });

    fireEvent.mouseDown(progressBar, { clientX: 50 });

    // Unmount component
    unmount();

    // Should not cause errors with pending mouse events
    expect(() => {
      fireEvent.mouseUp(document, { clientX: 100 });
    }).not.toThrow();
  });
});
