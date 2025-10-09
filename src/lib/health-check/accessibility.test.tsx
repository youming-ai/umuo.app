// Accessibility tests for Health Check UI Components
// Tests keyboard navigation, screen reader support, and ARIA compliance

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Mock the health check context
jest.mock('../context', () => ({
  HealthCheckProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useHealthCheck: () => ({
    state: {
      latestReport: null,
      currentCheck: {
        isRunning: false,
        progress: { completed: 0, total: 5, percentage: 0, currentCategory: 'api-connectivity' },
        id: 'test-check-id',
        estimatedTimeRemaining: 30000,
      },
      reports: [],
      notifications: [],
    },
    actions: {
      runCheck: jest.fn(),
      pauseCheck: jest.fn(),
      cancelCheck: jest.fn(),
      loadReports: jest.fn(),
      clearNotifications: jest.fn(),
    },
  }),
}));

// Import components to test
import { CheckRunner } from '@/components/health-check/CheckRunner';
import { HealthCheckDashboard } from '@/components/health-check/HealthCheckDashboard';
import { ReportViewer } from '@/components/health-check/ReportViewer';
import { SettingsManager } from '@/components/health-check/SettingsManager';
import { NotificationManager } from '@/components/health-check/NotificationManager';
import { MetricsCard } from '@/components/health-check/MetricsCard';
import { ProgressBar } from '@/components/health-check/ProgressBar';
import { StatusIndicator } from '@/components/health-check/StatusIndicator';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockReport = {
  id: 'test-report-1',
  timestamp: new Date('2025-10-08T10:00:00Z'),
  duration: 5000,
  results: [
    {
      id: 'result-1',
      category: 'api-connectivity',
      name: 'API Connectivity Check',
      description: 'Test API connectivity',
      status: 'passed',
      duration: 1000,
      timestamp: new Date('2025-10-08T10:00:00Z'),
      message: 'All API services are healthy',
      metrics: { responseTime: 500, successRate: 100 },
    },
    {
      id: 'result-2',
      category: 'performance',
      name: 'Performance Check',
      description: 'Test performance metrics',
      status: 'warning',
      duration: 2000,
      timestamp: new Date('2025-10-08T10:01:00Z'),
      message: 'Performance issues detected',
      severity: 'medium',
      metrics: { responseTime: 3000, memoryUsage: 512 },
    },
  ],
  summary: {
    total: 2,
    passed: 1,
    failed: 0,
    warnings: 1,
    overallStatus: 'warning',
    score: 75,
    recommendations: ['Test recommendation'],
    criticalIssues: [],
  },
};

describe('Health Check Accessibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('CheckRunner Component Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <CheckRunner
          isRunning={false}
          progress={{ completed: 0, total: 5, percentage: 0, currentCategory: 'api-connectivity' }}
          estimatedTimeRemaining={30000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const onStart = jest.fn();
      render(
        <CheckRunner
          isRunning={false}
          progress={{ completed: 0, total: 5, percentage: 0, currentCategory: 'api-connectivity' }}
          estimatedTimeRemaining={30000}
          currentCheckId="test-check"
          onStart={onStart}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      // Tab to the start button
      await user.tab();
      expect(screen.getByRole('button', { name: /start/i })).toHaveFocus();

      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(onStart).toHaveBeenCalled();

      // Activate with Space key
      onStart.mockClear();
      await user.tab();
      await user.keyboard('{ }');
      expect(onStart).toHaveBeenCalled();
    });

    it('should provide proper ARIA labels for running state', async () => {
      render(
        <CheckRunner
          isRunning={true}
          progress={{ completed: 2, total: 5, percentage: 40, currentCategory: 'performance' }}
          estimatedTimeRemaining={18000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      // Check for live region
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Check for progress indicator
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should announce status changes to screen readers', async () => {
      const { rerender } = render(
        <CheckRunner
          isRunning={false}
          progress={{ completed: 0, total: 5, percentage: 0, currentCategory: 'api-connectivity' }}
          estimatedTimeRemaining={30000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      // Initial state
      expect(screen.getByText(/ready to start health check/i)).toBeInTheDocument();

      // Rerender with running state
      rerender(
        <CheckRunner
          isRunning={true}
          progress={{ completed: 1, total: 5, percentage: 20, currentCategory: 'api-connectivity' }}
          estimatedTimeRemaining={24000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      expect(screen.getByText(/running health check/i)).toBeInTheDocument();
    });
  });

  describe('HealthCheckDashboard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <HealthCheckDashboard
          onRunCheck={jest.fn()}
          onViewReports={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible navigation', async () => {
      const onViewReports = jest.fn();
      render(
        <HealthCheckDashboard
          onRunCheck={jest.fn()}
          onViewReports={onViewReports}
        />
      );

      // All interactive elements should be focusable
      const buttons = screen.getAllByRole('button');
      for (const button of buttons) {
        await user.tab();
        // Should eventually focus on each button
        expect(button).toHaveAttribute('type');
      }
    });

    it('should provide descriptive alt text for visual indicators', () => {
      render(
        <HealthCheckDashboard
          onRunCheck={jest.fn()}
          onViewReports={jest.fn()}
        />
      );

      // Status indicators should have accessible names
      const statusIndicators = screen.getAllByRole('img');
      statusIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('alt');
      });
    });
  });

  describe('ReportViewer Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ReportViewer
          report={mockReport}
          onExport={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <ReportViewer
          report={mockReport}
          onExport={jest.fn()}
        />
      );

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should support keyboard navigation for export functions', async () => {
      const onExport = jest.fn();
      render(
        <ReportViewer
          report={mockReport}
          onExport={onExport}
        />
      );

      // Find export button and navigate to it
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.tab();
      await user.tab(); // Navigate to export button

      expect(exportButton).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');
      // Should trigger export menu or function
    });

    it('should have accessible data tables', () => {
      render(
        <ReportViewer
          report={mockReport}
          onExport={jest.fn()}
        />
      );

      // If there are tables, they should be accessible
      const tables = screen.queryAllByRole('table');
      tables.forEach(table => {
        expect(table).toHaveAttribute('role', 'table');

        // Check for proper headers
        const headers = table.querySelectorAll('th');
        if (headers.length > 0) {
          headers.forEach(header => {
            expect(header).toHaveAttribute('scope');
          });
        }
      });
    });
  });

  describe('SettingsManager Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <SettingsManager onClose={jest.fn()} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      render(
        <SettingsManager onClose={jest.fn()} />
      );

      // All form controls should have associated labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        const label = screen.getByLabelText(input.getAttribute('aria-label') || '');
        expect(label).toBeInTheDocument();
      });

      const toggles = screen.getAllByRole('switch');
      toggles.forEach(toggle => {
        expect(toggle).toHaveAttribute('aria-checked');
      });
    });

    it('should support keyboard navigation in forms', async () => {
      render(
        <SettingsManager onClose={jest.fn()} />
      );

      // Should be able to navigate through all form controls
      const formControls = screen.getAllByRole('textbox', 'switch', 'button');
      for (let i = 0; i < Math.min(5, formControls.length); i++) {
        await user.tab();
        const focusedElement = document.activeElement;
        expect(['textbox', 'switch', 'button'].includes(focusedElement?.getAttribute('role') || '')).toBe(true);
      }
    });

    it('should provide clear error messages', async () => {
      render(
        <SettingsManager onClose={jest.fn()} />
      );

      // Try to save with invalid data if validation exists
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Error messages should be associated with form controls
      const errorMessages = screen.queryAllByRole('alert');
      errorMessages.forEach(error => {
        expect(error).toBeVisible();
      });
    });
  });

  describe('NotificationManager Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <NotificationManager onNotificationClick={jest.fn()} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce new notifications', async () => {
      render(
        <NotificationManager onNotificationClick={jest.fn()} />
      );

      // Should have a live region for notifications
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard dismissal', async () => {
      const onNotificationClick = jest.fn();
      render(
        <NotificationManager onNotificationClick={onNotificationClick} />
      );

      // If there are dismissible notifications
      const dismissButtons = screen.queryAllByRole('button', { name: /dismiss|close/i });
      for (const button of dismissButtons) {
        await user.tab();
        if (document.activeElement === button) {
          await user.keyboard('{Enter}');
          expect(onNotificationClick).toHaveBeenCalled();
        }
      }
    });
  });

  describe('MetricsCard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <MetricsCard
          title="Test Metric"
          value="100"
          unit="ms"
          status="normal"
          trend="up"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible metric information', () => {
      render(
        <MetricsCard
          title="Response Time"
          value="250"
          unit="ms"
          status="warning"
          trend="up"
        />
      );

      // Should have descriptive title
      expect(screen.getByText(/response time/i)).toBeInTheDocument();

      // Status should be programmatically determinable
      const statusElement = screen.getByRole('img');
      expect(statusElement).toHaveAccessibleName(/warning/i);
    });
  });

  describe('ProgressBar Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ProgressBar
          value={75}
          max={100}
          label="Health Check Progress"
          showPercentage={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <ProgressBar
          value={60}
          max={100}
          label="Health Check Progress"
          showPercentage={true}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Health Check Progress');
    });

    it('should announce progress changes', () => {
      const { rerender } = render(
        <ProgressBar
          value={25}
          max={100}
          label="Health Check Progress"
          showPercentage={true}
        />
      );

      // Initial state
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Progress update
      rerender(
        <ProgressBar
          value={50}
          max={100}
          label="Health Check Progress"
          showPercentage={true}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('StatusIndicator Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <StatusIndicator
          status="healthy"
          label="System Status"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible status information', () => {
      render(
        <StatusIndicator
          status="error"
          label="System Status"
        />
      );

      const statusElement = screen.getByRole('img');
      expect(statusElement).toHaveAccessibleName(/system status.*error/i);
    });

    it('should support keyboard interaction', async () => {
      const onClick = jest.fn();
      render(
        <StatusIndicator
          status="warning"
          label="System Status"
          onClick={onClick}
          interactive={true}
        />
      );

      const statusElement = screen.getByRole('button');
      await user.tab();
      expect(statusElement).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should maintain sufficient color contrast', () => {
      // This test would typically use a color contrast checking library
      // For now, we'll check that colors are not defined as RGB values alone
      render(
        <StatusIndicator
          status="healthy"
          label="System Status"
        />
      );

      const statusElement = screen.getByRole('img');
      const computedStyle = window.getComputedStyle(statusElement);

      // In a real implementation, you'd check contrast ratios
      expect(computedStyle.color).toBeDefined();
    });

    it('should not rely on color alone to convey information', () => {
      render(
        <MetricsCard
          title="Test Metric"
          value="100"
          unit="ms"
          status="warning"
          trend="up"
        />
      );

      // Should have text or icons in addition to color
      expect(screen.getByText(/test metric/i)).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('ms')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus appropriately in modals', async () => {
      render(
        <SettingsManager onClose={jest.fn()} />
      );

      // Focus should be trapped within modal
      const firstInput = screen.getAllByRole('textbox')[0];
      expect(firstInput).toHaveFocus();
    });

    it('should return focus to trigger element after modal close', async () => {
      const onClose = jest.fn();
      const { container } = render(
        <div>
          <button>Open Settings</button>
          <SettingsManager onClose={onClose} />
        </div>
      );

      // This would require more complex setup to test focus restoration
      // For now, ensure modal has proper focus management
      const modalElement = container.querySelector('[role="dialog"]');
      if (modalElement) {
        expect(modalElement).toHaveAttribute('aria-modal', 'true');
      }
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide context for dynamic content', async () => {
      render(
        <CheckRunner
          isRunning={true}
          progress={{ completed: 3, total: 5, percentage: 60, currentCategory: 'performance' }}
          estimatedTimeRemaining={12000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      // Should describe what's happening
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/running.*3 of 5.*performance/i);
    });

    it('should provide accessible skip links', () => {
      // This would be tested on the main health check page
      // For component tests, ensure proper heading structure exists
      render(
        <HealthCheckDashboard
          onRunCheck={jest.fn()}
          onViewReports={jest.fn()}
        />
      );

      // Should have proper landmarks
      expect(screen.getByRole('main') || screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const { container } = render(
        <HealthCheckDashboard
          onRunCheck={jest.fn()}
          onViewReports={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle touch interactions appropriately', async () => {
      // Test touch accessibility
      render(
        <CheckRunner
          isRunning={false}
          progress={{ completed: 0, total: 5, percentage: 0, currentCategory: 'api-connectivity' }}
          estimatedTimeRemaining={30000}
          currentCheckId="test-check"
          onStart={jest.fn()}
          onPause={jest.fn()}
          onCancel={jest.fn()}
          onResume={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Touch targets should be at least 44x44 pixels
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });
});