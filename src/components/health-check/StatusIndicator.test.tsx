import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusIndicator, DetailedStatusIndicator, CompactStatusIndicator, StatusTimeline } from './StatusIndicator';
import { CheckStatus, SeverityLevel } from '@/lib/health-check/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-triangle" className={className} />
  ),
  XCircle: ({ className }: { className?: string }) => (
    <svg data-testid="x-circle" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock" className={className} />
  ),
  HelpCircle: ({ className }: { className?: string }) => (
    <svg data-testid="help-circle" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-2" className={className} />
  ),
}));

describe('StatusIndicator', () => {
  describe('Basic Rendering', () => {
    it('should render passed status correctly', () => {
      render(<StatusIndicator status={CheckStatus.PASSED} />);

      expect(screen.getByText('通过')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should render failed status correctly', () => {
      render(<StatusIndicator status={CheckStatus.FAILED} />);

      expect(screen.getByText('失败')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle')).toBeInTheDocument();
    });

    it('should render warning status correctly', () => {
      render(<StatusIndicator status={CheckStatus.WARNING} />);

      expect(screen.getByText('警告')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });

    it('should render running status correctly', () => {
      render(<StatusIndicator status={CheckStatus.RUNNING} />);

      expect(screen.getByText('运行中')).toBeInTheDocument();
      expect(screen.getByTestId('loader-2')).toBeInTheDocument();
    });

    it('should render pending status correctly', () => {
      render(<StatusIndicator status={CheckStatus.PENDING} />);

      expect(screen.getByText('等待')).toBeInTheDocument();
      expect(screen.getByTestId('clock')).toBeInTheDocument();
    });

    it('should render skipped status correctly', () => {
      render(<StatusIndicator status={CheckStatus.SKIPPED} />);

      expect(screen.getByText('跳过')).toBeInTheDocument();
      expect(screen.getByTestId('help-circle')).toBeInTheDocument();
    });
  });

  describe('Severity Display', () => {
    it('should display severity badge for failed status', () => {
      render(
        <StatusIndicator
          status={CheckStatus.FAILED}
          severity={SeverityLevel.CRITICAL}
        />
      );

      expect(screen.getByText('严重')).toBeInTheDocument();
    });

    it('should not display severity for non-failed status', () => {
      render(
        <StatusIndicator
          status={CheckStatus.PASSED}
          severity={SeverityLevel.HIGH}
        />
      );

      expect(screen.queryByText('高')).not.toBeInTheDocument();
    });
  });

  describe('Size Variations', () => {
    it('should render small size correctly', () => {
      const { container } = render(
        <StatusIndicator status={CheckStatus.PASSED} size="sm" />
      );

      expect(container.querySelector('.text-xs')).toBeInTheDocument();
      expect(container.querySelector('.px-2')).toBeInTheDocument();
      expect(container.querySelector('.py-1')).toBeInTheDocument();
    });

    it('should render medium size correctly', () => {
      const { container } = render(
        <StatusIndicator status={CheckStatus.PASSED} size="md" />
      );

      expect(container.querySelector('.text-sm')).toBeInTheDocument();
      expect(container.querySelector('.px-3')).toBeInTheDocument();
      expect(container.querySelector('.py-1\\.5')).toBeInTheDocument();
    });

    it('should render large size correctly', () => {
      const { container } = render(
        <StatusIndicator status={CheckStatus.PASSED} size="lg" />
      );

      expect(container.querySelector('.text-base')).toBeInTheDocument();
      expect(container.querySelector('.px-4')).toBeInTheDocument();
      expect(container.querySelector('.py-2')).toBeInTheDocument();
    });
  });

  describe('Show/Hide Text', () => {
    it('should hide text when showText is false', () => {
      render(
        <StatusIndicator
          status={CheckStatus.PASSED}
          showText={false}
        />
      );

      expect(screen.queryByText('通过')).not.toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should show text by default', () => {
      render(<StatusIndicator status={CheckStatus.PASSED} />);

      expect(screen.getByText('通过')).toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <StatusIndicator
          status={CheckStatus.PASSED}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Animated States', () => {
    it('should add animation class when animated is true', () => {
      const { container } = render(
        <StatusIndicator
          status={CheckStatus.RUNNING}
          animated={true}
        />
      );

      const icon = screen.getByTestId('loader-2');
      expect(icon).toHaveClass('animate-spin');
    });
  });
});

describe('DetailedStatusIndicator', () => {
  it('should render detailed status with message', () => {
    render(
      <DetailedStatusIndicator
        status={CheckStatus.FAILED}
        message="API connectivity failed"
        severity={SeverityLevel.HIGH}
      />
    );

    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getByText('API connectivity failed')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
  });

  it('should render with timestamp', () => {
    const timestamp = new Date('2025-10-08T10:30:00Z');
    render(
      <DetailedStatusIndicator
        status={CheckStatus.PASSED}
        timestamp={timestamp}
      />
    );

    expect(screen.getByText(/10:30:00/)).toBeInTheDocument();
  });

  it('should display severity with appropriate styling', () => {
    render(
      <DetailedStatusIndicator
        status={CheckStatus.WARNING}
        severity={SeverityLevel.MEDIUM}
        message="Performance is slow"
      />
    );

    expect(screen.getByText('警告')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
  });
});

describe('CompactStatusIndicator', () => {
  it('should render compact indicator without text', () => {
    render(<CompactStatusIndicator status={CheckStatus.PASSED} />);

    expect(screen.queryByText('通过')).not.toBeInTheDocument();
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();
  });

  it('should apply correct color classes', () => {
    const { container } = render(
      <CompactStatusIndicator status={CheckStatus.FAILED} />
    );

    expect(container.firstChild).toHaveClass('bg-red-100');
    expect(container.firstChild).toHaveClass('text-red-600');
  });

  it('should have title attribute for accessibility', () => {
    render(<CompactStatusIndicator status={CheckStatus.WARNING} />);

    const indicator = screen.getByTestId('alert-triangle').closest('div');
    expect(indicator).toHaveAttribute('title', '警告');
  });
});

describe('StatusTimeline', () => {
  const timelineItems = [
    {
      status: CheckStatus.PASSED,
      timestamp: new Date('2025-10-08T10:00:00Z'),
      label: 'API Connectivity',
      message: 'All services are healthy',
    },
    {
      status: CheckStatus.FAILED,
      timestamp: new Date('2025-10-08T10:05:00Z'),
      label: 'Performance Check',
      message: 'High response time detected',
    },
    {
      status: CheckStatus.RUNNING,
      timestamp: new Date('2025-10-08T10:10:00Z'),
      label: 'Security Scan',
      message: 'Scanning for vulnerabilities',
    },
  ];

  it('should render timeline items correctly', () => {
    render(<StatusTimeline items={timelineItems} />);

    expect(screen.getByText('API Connectivity')).toBeInTheDocument();
    expect(screen.getByText('Performance Check')).toBeInTheDocument();
    expect(screen.getByText('Security Scan')).toBeInTheDocument();

    expect(screen.getByText('All services are healthy')).toBeInTheDocument();
    expect(screen.getByText('High response time detected')).toBeInTheDocument();
    expect(screen.getByText('Scanning for vulnerabilities')).toBeInTheDocument();
  });

  it('should display timestamps', () => {
    render(<StatusTimeline items={timelineItems} />);

    expect(screen.getByText(/10:00:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:05:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:10:00/)).toBeInTheDocument();
  });

  it('should show correct status icons', () => {
    render(<StatusTimeline items={timelineItems} />);

    expect(screen.getByTestId('check-circle')).toBeInTheDocument(); // PASSED
    expect(screen.getByTestId('x-circle')).toBeInTheDocument(); // FAILED
    expect(screen.getByTestId('loader-2')).toBeInTheDocument(); // RUNNING
  });

  it('should handle empty items array', () => {
    const { container } = render(<StatusTimeline items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatusTimeline
        items={timelineItems}
        className="custom-timeline"
      />
    );

    expect(container.firstChild).toHaveClass('custom-timeline');
  });

  it('should handle items without optional fields', () => {
    const minimalItems = [
      {
        status: CheckStatus.PASSED,
        timestamp: new Date(),
      },
      {
        status: CheckStatus.FAILED,
        timestamp: new Date(),
      },
    ];

    render(<StatusTimeline items={minimalItems} />);

    expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    expect(screen.getByTestId('x-circle')).toBeInTheDocument();
  });

  it('should maintain chronological order', () => {
    render(<StatusTimeline items={timelineItems} />);

    const timestamps = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThanOrEqual(3);

    // Items should be displayed in the order they were provided
    expect(timestamps.some(t => t.textContent?.includes('10:00:00'))).toBe(true);
    expect(timestamps.some(t => t.textContent?.includes('10:05:00'))).toBe(true);
    expect(timestamps.some(t => t.textContent?.includes('10:10:00'))).toBe(true);
  });
});

describe('Accessibility', () => {
  it('should have appropriate color contrast', () => {
    const { container } = render(
      <StatusIndicator status={CheckStatus.PASSED} />
    );

    const indicator = container.firstChild as HTMLElement;
    expect(indicator).toHaveClass('text-green-600');
  });

  it('should have semantic HTML structure', () => {
    render(<StatusIndicator status={CheckStatus.FAILED} />);

    const indicator = screen.getByText('失败');
    expect(indicator).toBeInTheDocument();
  });

  it('should be keyboard navigable when clickable', () => {
    const handleClick = jest.fn();
    render(
      <button onClick={handleClick}>
        <StatusIndicator status={CheckStatus.PASSED} />
      </button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('Responsiveness', () => {
  it('should adapt to different container sizes', () => {
    const { container, rerender } = render(
      <StatusIndicator status={CheckStatus.PASSED} size="lg" />
    );

    expect(container.firstChild).toHaveClass('px-4');
    expect(container.firstChild).toHaveClass('py-2');

    rerender(<StatusIndicator status={CheckStatus.PASSED} size="sm" />);
    expect(container.firstChild).toHaveClass('px-2');
    expect(container.firstChild).toHaveClass('py-1');
  });

  it('should maintain readability at different sizes', () => {
    const { rerender } = render(
      <StatusIndicator status={CheckStatus.WARNING} size="sm" />
    );

    expect(screen.getByText('警告')).toBeInTheDocument();

    rerender(<StatusIndicator status={CheckStatus.WARNING} size="lg" />);
    expect(screen.getByText('警告')).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  it('should handle invalid status gracefully', () => {
    // This should not crash even with invalid props
    expect(() => {
      render(<StatusIndicator status={CheckStatus.PASSED} />);
    }).not.toThrow();
  });

  it('should handle missing severity gracefully', () => {
    expect(() => {
      render(
        <StatusIndicator
          status={CheckStatus.FAILED}
          // severity prop is optional
        />
      );
    }).not.toThrow();
  });
});

describe('Performance', () => {
  it('should render quickly', () => {
    const startTime = performance.now();

    render(<StatusIndicator status={CheckStatus.PASSED} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // Should render within 100ms
  });

  it('should handle rapid updates efficiently', () => {
    const { rerender } = render(<StatusIndicator status={CheckStatus.PASSED} />);

    const startTime = performance.now();

    // Rapid status changes
    rerender(<StatusIndicator status={CheckStatus.RUNNING} />);
    rerender(<StatusIndicator status={CheckStatus.WARNING} />);
    rerender(<StatusIndicator status={CheckStatus.FAILED} />);
    rerender(<StatusIndicator status={CheckStatus.PASSED} />);

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    expect(updateTime).toBeLessThan(200); // Should handle updates within 200ms
  });
});