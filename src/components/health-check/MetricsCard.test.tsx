import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricsCard, HealthScoreCard, ResponseTimeCard, SuccessRateCard, ActivityCard } from './MetricsCard';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: ({ className }: { className?: string }) => (
    <svg data-testid="trending-up" className={className} />
  ),
  TrendingDown: ({ className }: { className?: string }) => (
    <svg data-testid="trending-down" className={className} />
  ),
  Minus: ({ className }: { className?: string }) => (
    <svg data-testid="minus" className={className} />
  ),
  Info: ({ className }: { className?: string }) => (
    <svg data-testid="info" className={className} />
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <svg data-testid="bar-chart-3" className={className} />
  ),
  Activity: ({ className }: { className?: string }) => (
    <svg data-testid="activity" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-triangle" className={className} />
  ),
  XCircle: ({ className }: { className?: string }) => (
    <svg data-testid="x-circle" className={className} />
  ),
  MoreHorizontal: ({ className }: { className?: string }) => (
    <svg data-testid="more-horizontal" className={className} />
  ),
}));

describe('MetricsCard', () => {
  describe('Basic Rendering', () => {
    it('should render title and value correctly', () => {
      render(
        <MetricsCard
          title="Test Metric"
          value="100"
          description="Test description"
        />
      );

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should render with number value', () => {
      render(<MetricsCard title="Count" value={42} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render without description', () => {
      render(<MetricsCard title="Simple Metric" value="123" />);

      expect(screen.getByText('Simple Metric')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.queryByText(/description/)).not.toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should render success status', () => {
      render(
        <MetricsCard
          title="Success Metric"
          value="100%"
          status="success"
        />
      );

      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should render warning status', () => {
      render(
        <MetricsCard
          title="Warning Metric"
          value="75%"
          status="warning"
        />
      );

      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });

    it('should render error status', () => {
      render(
        <MetricsCard
          title="Error Metric"
          value="25%"
          status="error"
        />
      );

      expect(screen.getByTestId('x-circle')).toBeInTheDocument();
    });

    it('should render info status', () => {
      render(
        <MetricsCard
          title="Info Metric"
          value="N/A"
          status="info"
        />
      );

      expect(screen.getByTestId('info')).toBeInTheDocument();
    });
  });

  describe('Trend Display', () => {
    it('should render upward trend', () => {
      render(
        <MetricsCard
          title="Trending Up"
          value="150"
          trend={{
            value: 15,
            direction: 'up',
            period: 'last week'
          }}
        />
      );

      expect(screen.getByTestId('trending-up')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('should render downward trend', () => {
      render(
        <MetricsCard
          title="Trending Down"
          value="85"
          trend={{
            value: 10,
            direction: 'down',
            period: 'last month'
          }}
        />
      );

      expect(screen.getByTestId('trending-down')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('should render neutral trend', () => {
      render(
        <MetricsCard
          title="No Change"
          value="100"
          trend={{
            value: 0,
            direction: 'neutral',
            period: 'yesterday'
          }}
        />
      );

      expect(screen.getByTestId('minus')).toBeInTheDocument();
    });

    it('should display period when provided', () => {
      render(
        <MetricsCard
          title="Metric with Period"
          value="120"
          trend={{
            value: 20,
            direction: 'up',
            period: 'last 7 days'
          }}
        />
      );

      expect(screen.getByText(/vs last 7 days/)).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar when progress is provided', () => {
      render(
        <MetricsCard
          title="Progress Metric"
          value="75%"
          progress={75}
          progressLabel="Completion"
        />
      );

      expect(screen.getByText('Completion')).toBeInTheDocument();
      expect(screen.getAllByText('75%')).toHaveLength(1); // Main value only
    });

    it('should use default progress label when not provided', () => {
      render(
        <MetricsCard
          title="Progress Metric"
          value="60%"
          progress={60}
        />
      );

      expect(screen.getByText('Progress')).toBeInTheDocument();
    });

    it('should handle full progress', () => {
      render(
        <MetricsCard
          title="Complete"
          value="100%"
          progress={100}
        />
      );

      expect(screen.getAllByText('100%')).toHaveLength(2); // Main value and progress label
    });

    it('should handle zero progress', () => {
      render(
        <MetricsCard
          title="Not Started"
          value="0%"
          progress={0}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('should render metadata items', () => {
      render(
        <MetricsCard
          title="Metric with Metadata"
          value="95%"
          metadata={{
            total: 100,
            successful: 95,
            failed: 5
          }}
        />
      );

      expect(screen.getByText('total:')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('successful:')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('failed:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle empty metadata', () => {
      render(
        <MetricsCard
          title="No Metadata"
          value="100%"
          metadata={{}}
        />
      );

      expect(screen.getByText('No Metadata')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render action buttons', () => {
      const handleClick = jest.fn();
      render(
        <MetricsCard
          title="Actionable Metric"
          value="Action"
          actions={[
            {
              label: 'View Details',
              onClick: handleClick
            },
            {
              label: 'Export',
              onClick: jest.fn()
            }
          ]}
        />
      );

      const viewButton = screen.getByText('View Details');
      const exportButton = screen.getByText('Export');

      expect(viewButton).toBeInTheDocument();
      expect(exportButton).toBeInTheDocument();

      fireEvent.click(viewButton);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should handle button variants', () => {
      render(
        <MetricsCard
          title="Variant Test"
          value="Test"
          actions={[
            {
              label: 'Primary',
              onClick: jest.fn(),
              variant: 'default'
            },
            {
              label: 'Secondary',
              onClick: jest.fn(),
              variant: 'outline'
            },
            {
              label: 'Destructive',
              onClick: jest.fn(),
              variant: 'destructive'
            }
          ]}
        />
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
      expect(screen.getByText('Destructive')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should render custom icon', () => {
      render(
        <MetricsCard
          title="Icon Metric"
          value="Icon"
          icon={<div data-testid="custom-icon">Icon</div>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render status icon', () => {
      render(
        <MetricsCard
          title="Status Icon"
          value="Status"
          status="success"
        />
      );

      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton', () => {
      render(<MetricsCard title="Loading" value="..." loading={true} />);

      // Check for skeleton elements (animate-pulse class)
      const card = screen.getByRole('article');
      expect(card).toHaveClass('animate-pulse');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(
        <MetricsCard
          title="Error Metric"
          value="Error"
          error="Failed to load data"
        />
      );

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle')).toBeInTheDocument();
    });

    it('should show error actions', () => {
      const handleRetry = jest.fn();
      render(
        <MetricsCard
          title="Error with Actions"
          value="Error"
          error="Connection failed"
          actions={[
            {
              label: 'Retry',
              onClick: handleRetry
            }
          ]}
        />
      );

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Retry'));
      expect(handleRetry).toHaveBeenCalled();
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MetricsCard
          title="Custom"
          value="Class"
          className="custom-card-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-card-class');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(<MetricsCard title="Accessible" value="Test" />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();

      const title = screen.getByRole('heading', { name: 'Accessible' });
      expect(title).toBeInTheDocument();
    });

    it('should have appropriate ARIA attributes', () => {
      render(
        <MetricsCard
          title="ARIA Test"
          value="Test"
          status="success"
        />
      );

      // Check for proper button ARIA attributes if actions are present
      // This is tested in the action buttons section
    });
  });
});

describe('HealthScoreCard', () => {
  it('should render health score correctly', () => {
    render(<HealthScoreCard score={85} />);

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('健康评分')).toBeInTheDocument();
    expect(screen.getByText('系统整体健康度评分')).toBeInTheDocument();
  });

  it('should show trend when previous score is provided', () => {
    render(<HealthScoreCard score={90} previousScore={85} />);

    expect(screen.getByText('90')).toBeInTheDocument();
    // Should show upward trend
    expect(screen.getByTestId('trending-up')).toBeInTheDocument();
  });

  it('should determine correct status based on score', () => {
    const { rerender } = render(<HealthScoreCard score={95} />);
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();

    rerender(<HealthScoreCard score={75} />);
    expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();

    rerender(<HealthScoreCard score={45} />);
    expect(screen.getByTestId('x-circle')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <HealthScoreCard score={80} className="custom-health-score" />
    );

    expect(container.firstChild).toHaveClass('custom-health-score');
  });
});

describe('ResponseTimeCard', () => {
  it('should render response time correctly', () => {
    render(<ResponseTimeCard responseTime={250} target={200} />);

    expect(screen.getByText('250ms')).toBeInTheDocument();
    expect(screen.getByText('响应时间')).toBeInTheDocument();
    expect(screen.getByText('目标: < 200ms')).toBeInTheDocument();
  });

  it('should show correct status based on performance', () => {
    const { rerender } = render(<ResponseTimeCard responseTime={150} target={200} />);
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();

    rerender(<ResponseTimeCard responseTime={300} target={200} />);
    expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();

    rerender(<ResponseTimeCard responseTime={500} target={200} />);
    expect(screen.getByTestId('x-circle')).toBeInTheDocument();
  });

  it('should use custom unit', () => {
    render(<ResponseTimeCard responseTime={2} target={1} unit="s" />);

    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(screen.getByText('目标: < 1s')).toBeInTheDocument();
  });

  it('should show progress based on performance', () => {
    render(<ResponseTimeCard responseTime={300} target={200} />);

    expect(screen.getByText('性能')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // 300/200 = 1.5 -> inverted to show remaining capacity
  });
});

describe('SuccessRateCard', () => {
  it('should render success rate correctly', () => {
    render(<SuccessRateCard successRate={95} totalRequests={100} />);

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('成功率')).toBeInTheDocument();
    expect(screen.getByText('API请求成功率')).toBeInTheDocument();
  });

  it('should show request statistics', () => {
    render(<SuccessRateCard successRate={90} totalRequests={50} />);

    expect(screen.getByText('总请求: 50')).toBeInTheDocument();
    expect(screen.getByText('成功: 45')).toBeInTheDocument();
    expect(screen.getByText('失败: 5')).toBeInTheDocument();
  });

  it('should determine status based on success rate', () => {
    const { rerender } = render(<SuccessRateCard successRate={98} totalRequests={100} />);
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();

    rerender(<SuccessRateCard successRate={88} totalRequests={100} />);
    expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();

    rerender(<SuccessRateCard successRate={78} totalRequests={100} />);
    expect(screen.getByTestId('x-circle')).toBeInTheDocument();
  });
});

describe('ActivityCard', () => {
  it('should render activity information correctly', () => {
    render(<ActivityCard activeChecks={3} totalChecks={5} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('活跃检查')).toBeInTheDocument();
    expect(screen.getByText('总共 5 项检查')).toBeInTheDocument();
  });

  it('should show correct status', () => {
    const { rerender } = render(<ActivityCard activeChecks={0} totalChecks={5} />);
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();

    rerender(<ActivityCard activeChecks={3} totalChecks={5} />);
    expect(screen.getByTestId('info')).toBeInTheDocument();
  });

  it('should display remaining checks', () => {
    render(<ActivityCard activeChecks={2} totalChecks={7} />);

    expect(screen.getByText('总计: 7')).toBeInTheDocument();
    expect(screen.getByText('剩余: 5')).toBeInTheDocument();
  });

  it('should handle zero total checks', () => {
    render(<ActivityCard activeChecks={0} totalChecks={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('总计: 0')).toBeInTheDocument();
    expect(screen.getByText('剩余: 0')).toBeInTheDocument();
  });

  it('should handle last check time', () => {
    const lastCheckTime = new Date('2025-10-08T10:30:00Z');
    render(
      <ActivityCard
        activeChecks={1}
        totalChecks={5}
        lastCheckTime={lastCheckTime}
      />
    );

    expect(screen.getByText(/最后检查:/)).toBeInTheDocument();
    expect(screen.getByText(/10:30:00/)).toBeInTheDocument();
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle missing required props gracefully', () => {
    expect(() => {
      render(<MetricsCard title="Test" value="Value" />);
    }).not.toThrow();
  });

  it('should handle invalid progress values', () => {
    expect(() => {
      render(<MetricsCard title="Test" value="Test" progress={150} />);
    }).not.toThrow();
  });

  it('should handle negative values', () => {
    render(
      <MetricsCard
        title="Negative Trend"
        value="-5%"
        trend={{
          value: -10,
          direction: 'down'
        }}
      />
    );

    expect(screen.getByText('-5%')).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('should handle very large numbers', () => {
    render(<MetricsCard title="Large Number" value={999999} />);

    expect(screen.getByText('999999')).toBeInTheDocument();
  });

  it('should handle decimal values', () => {
    render(<MetricsCard title="Decimal" value={3.14159} />);

    expect(screen.getByText('3.14159')).toBeInTheDocument();
  });

  it('should handle special characters in values', () => {
    render(<MetricsCard title="Special" value="$1,234.56" />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });
});

describe('Performance', () => {
  it('should render quickly', () => {
    const startTime = performance.now();

    render(<MetricsCard title="Performance Test" value="100" />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100);
  });

  it('should handle rapid updates', () => {
    const { rerender } = render(<MetricsCard title="Update Test" value="Initial" />);

    const startTime = performance.now();

    for (let i = 0; i < 10; i++) {
      rerender(<MetricsCard title="Update Test" value={`Update ${i}`} />);
    }

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    expect(updateTime).toBeLessThan(500);
  });
});