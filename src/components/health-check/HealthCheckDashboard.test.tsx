import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import HealthCheckDashboard from './HealthCheckDashboard';

// Mock the hooks
jest.mock('@/hooks/useHealthCheck', () => ({
  useHealthCheckOperations: () => ({
    isRunning: false,
    progress: { completed: 0, total: 0, percentage: 0 },
    estimatedTimeRemaining: 0,
    runQuickCheck: jest.fn(),
    runFullCheck: jest.fn(),
    runCustomCheck: jest.fn(),
    latestReport: null,
    systemStatus: 'warning',
    error: null,
    notifications: [],
    dismissNotification: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/hooks/useHealthCheckStats', () => ({
  useHealthCheckStats: () => ({
    score: 0,
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warningChecks: 0,
    lastCheckTime: null,
    duration: 0,
    issues: [],
  }),
}));

jest.mock('@/lib/health-check/types', () => ({
  CheckStatus: {
    PASSED: 'passed',
    FAILED: 'failed',
    WARNING: 'warning',
  },
  CheckCategory: {
    API_CONNECTIVITY: 'api-connectivity',
    ERROR_HANDLING: 'error-hndling',
    PERFORMANCE: 'performance',
    USER_EXPERIENCE: 'user-experience',
    SECURITY: 'security',
  },
}));

describe('HealthCheckDashboard', () => {
  const mockRunQuickCheck = jest.fn();
  const mockRunFullCheck = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title', () => {
    render(<HealthCheckDashboard />);

    expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
  });

  it('displays system status when no report available', () => {
    render(<HealthCheckDashboard />);

    expect(screen.getByText('No health checks performed yet')).toBeInTheDocument();
  });

  it('displays health score when report is available', () => {
    const mockReport = {
      timestamp: new Date(),
      score: 85,
      status: 'passed',
      duration: 45000,
      summary: {
        total: 10,
        passed: 8,
        failed: 1,
        warnings: 1,
        overallStatus: 'passed',
      },
    };

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: mockReport,
        systemStatus: 'healthy',
        error: null,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('85')).toBeInTheDocument(); // Health score
    expect(screen.getByText('Healthy')).toBeInTheDocument(); // System status
  });

  it('shows warning status for degraded system', () => {
    const mockReport = {
      timestamp: new Date(),
      score: 65,
      status: 'warning',
      duration: 55000,
      summary: {
        total: 10,
        passed: 6,
        failed: 2,
        warnings: 2,
        overallStatus: 'warning',
      },
    };

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: mockReport,
        systemStatus: 'warning',
        error: null,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('shows error status for failed system', () => {
    const mockReport = {
      timestamp: new Date(),
      score: 35,
      status: 'failed',
      duration: 65000,
      summary: {
        total: 10,
        passed: 3,
        failed: 5,
        warnings: 2,
        overallStatus: 'failed',
      },
    };

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: mockReport,
        systemStatus: 'error',
        error: null,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('Critical Issues')).toBeInTheDocument();
  });

  it('displays check statistics', () => {
    jest.doMock('@/hooks/useHealthCheckStats', () => ({
      useHealthCheckStats: () => ({
        score: 75,
        totalChecks: 25,
        passedChecks: 20,
        failedChecks: 3,
        warningChecks: 2,
        lastCheckTime: new Date('2023-10-08T10:30:00'),
        duration: 42000,
        issues: [],
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('25')).toBeInTheDocument(); // Total checks
    expect(screen.getByText('20')).toBeInTheDocument(); // Passed checks
    expect(screen.getByText('3')).toBeInTheDocument(); // Failed checks
    expect(screen.getByText('2')).toBeInTheDocument(); // Warning checks
  });

  it('shows last check time', () => {
    jest.doMock('@/hooks/useHealthCheckStats', () => ({
      useHealthCheckStats: () => ({
        score: 80,
        totalChecks: 10,
        passedChecks: 8,
        failedChecks: 1,
        warningChecks: 1,
        lastCheckTime: new Date('2023-10-08T10:30:00'),
        duration: 38000,
        issues: [],
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText(/Last check:/)).toBeInTheDocument();
  });

  it('displays running progress when check is in progress', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 5, total: 10, percentage: 50 },
        estimatedTimeRemaining: 60,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: null,
        systemStatus: 'warning',
        error: null,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('Health check in progress...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows notifications when present', () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'info',
        title: 'Health Check Completed',
        message: 'System health check completed successfully',
        timestamp: new Date(),
      },
    ];

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: null,
        systemStatus: 'warning',
        error: null,
        notifications: mockNotifications,
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText('Health Check Completed')).toBeInTheDocument();
    expect(screen.getByText('System health check completed successfully')).toBeInTheDocument();
  });

  it('can dismiss notifications', async () => {
    const mockDismissNotification = jest.fn();
    const mockNotifications = [
      {
        id: '1',
        type: 'warning',
        title: 'Warning',
        message: 'Test warning message',
        timestamp: new Date(),
      },
    ];

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: null,
        systemStatus: 'warning',
        error: null,
        notifications: mockNotifications,
        dismissNotification: mockDismissNotification,
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mockDismissNotification).toHaveBeenCalledWith('1');
    });
  });

  it('displays error messages when present', () => {
    const errorMessage = 'Failed to run health check';

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: null,
        systemStatus: 'warning',
        error: errorMessage,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<HealthCheckDashboard />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('can clear error messages', async () => {
    const mockClearError = jest.fn();
    const errorMessage = 'Test error message';

    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: jest.fn(),
        latestReport: null,
        systemStatus: 'warning',
        error: errorMessage,
        notifications: [],
        dismissNotification: jest.fn(),
        clearError: mockClearError,
      }),
    }));

    render(<HealthCheckDashboard />);

    const clearButton = screen.getByText('Clear Error');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to different sections', () => {
    render(<HealthCheckDashboard />);

    // Check for navigation tabs or buttons
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows health check categories', () => {
    render(<HealthCheckDashboard />);

    expect(screen.getByText('API Connectivity')).toBeInTheDocument();
    expect(screen.getByText('Error Handling')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('User Experience')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });
});