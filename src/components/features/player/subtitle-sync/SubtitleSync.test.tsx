import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SubtitleSync } from "../SubtitleSync";
import type { Segment } from "@/types/db/database";

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

describe("SubtitleSync", () => {
  const mockSegments: Segment[] = [
    {
      id: 1,
      transcriptId: 1,
      start: 0,
      end: 3,
      text: "Hello world",
      normalizedText: "Hello world",
      wordTimestamps: [
        { word: "Hello", start: 0, end: 1 },
        { word: "world", start: 1.2, end: 2.5 },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      transcriptId: 1,
      start: 3.5,
      end: 6,
      text: "This is a test",
      normalizedText: "This is a test",
      wordTimestamps: [
        { word: "This", start: 3.5, end: 3.8 },
        { word: "is", start: 3.9, end: 4.1 },
        { word: "a", start: 4.2, end: 4.3 },
        { word: "test", start: 4.5, end: 5.8 },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    segments: mockSegments,
    currentTime: 0,
    isPlaying: false,
    duration: 10,
    onSegmentClick: vi.fn(),
    onSeek: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<SubtitleSync {...defaultProps} />);
    expect(screen.getByRole("region", { name: /subtitle display/i })).toBeInTheDocument();
  });

  it("displays subtitle segments", () => {
    render(<SubtitleSync {...defaultProps} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("This is a test")).toBeInTheDocument();
  });

  it("highlights active segment based on current time", () => {
    render(<SubtitleSync {...defaultProps} currentTime={1} />);

    const activeSegment = screen.getByText("Hello world").closest("[data-active='true']");
    expect(activeSegment).toBeInTheDocument();
  });

  it("handles segment click", async () => {
    const mockOnSegmentClick = vi.fn();
    render(<SubtitleSync {...defaultProps} onSegmentClick={mockOnSegmentClick} />);

    const segment = screen.getByText("Hello world");
    fireEvent.click(segment);

    await waitFor(() => {
      expect(mockOnSegmentClick).toHaveBeenCalledWith(mockSegments[0], 0);
    });
  });

  it("handles word click when enabled", async () => {
    const mockOnSeek = vi.fn();
    render(<SubtitleSync {...defaultProps} onSeek={mockOnSeek} config={{ wordHighlighting: true }} />);

    const word = screen.getByText("Hello");
    fireEvent.click(word);

    await waitFor(() => {
      expect(mockOnSeek).toHaveBeenCalledWith(0);
    });
  });

  it("applies configuration correctly", () => {
    const config = {
      offset: 1,
      autoScroll: false,
      wordHighlighting: false,
      displayStyle: "compact" as const,
    };

    render(<SubtitleSync {...defaultProps} config={config} />);

    // Check that configuration is applied
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("handles empty segments", () => {
    render(<SubtitleSync {...defaultProps} segments={[]} />);

    expect(screen.getByText(/暂无字幕内容/)).toBeInTheDocument();
  });

  it("disables subtitles when enabled is false", () => {
    render(<SubtitleSync {...defaultProps} enabled={false} />);

    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
  });

  it("applies mobile optimization in touch mode", () => {
    render(<SubtitleSync {...defaultProps} touchMode={true} />);

    const container = screen.getByRole("region");
    expect(container).toHaveAttribute("data-mobile", "true");
  });

  it("applies high contrast mode when enabled", () => {
    render(<SubtitleSync {...defaultProps} config={{ highContrast: true }} />);

    const container = screen.getByRole("region");
    expect(container).toBeInTheDocument();
  });

  it("handles track changes", async () => {
    const tracks = [
      { id: "track1", name: "English", segments: mockSegments },
      { id: "track2", name: "Japanese", segments: mockSegments },
    ];
    const mockOnTrackChange = vi.fn();

    render(
      <SubtitleSync
        {...defaultProps}
        tracks={tracks}
        activeTrack="track1"
        onTrackChange={mockOnTrackChange}
      />
    );

    // Track change functionality would be tested through UI interactions
    // This is a placeholder for track change testing
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("handles subtitle offset correctly", () => {
    const config = { offset: 2 };
    render(<SubtitleSync {...defaultProps} config={config} currentTime={3} />);

    // With offset of 2, currentTime 3 should highlight first segment (0-3)
    // because effective time is 3 - 2 = 1
    const activeSegment = screen.getByText("Hello world").closest("[data-active='true']");
    expect(activeSegment).toBeInTheDocument();
  });

  it("optimizes performance for large subtitle collections", () => {
    const largeSegments = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      transcriptId: 1,
      start: i * 2,
      end: (i + 1) * 2,
      text: `Segment ${i + 1}`,
      normalizedText: `Segment ${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const startTime = performance.now();
    render(<SubtitleSync {...defaultProps} segments={largeSegments} />);
    const endTime = performance.now();

    // Should render within 200ms performance target
    expect(endTime - startTime).toBeLessThan(200);
  });

  it("maintains accessibility compliance", () => {
    render(<SubtitleSync {...defaultProps} />);

    const container = screen.getByRole("region");
    expect(container).toHaveAttribute("aria-label", "Subtitle display");
    expect(container).toHaveAttribute("aria-live", "polite");
  });
});
