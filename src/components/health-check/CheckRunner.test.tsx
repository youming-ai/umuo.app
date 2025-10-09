import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import CheckRunner from './CheckRunner';

// Mock the hooks
jest.mock('@/hooks/useHealthCheck', () => ({
  useHealthCheckOperations: () => ({
    isRunning: false,
    progress: { completed: 0, total: 0, percentage: 0 },
    estimatedTimeRemaining: 0,
    runQuickCheck: jest.fn(),
    runFullCheck: jest.fn(),
    runCustomCheck: jest.fn(),
    clearError: jest.fn(),
    error: null,
  }),
}));

jest.mock('@/lib/health-check/types', () => ({
  CheckCategory: {
    API_CONNECTIVITY: 'api-connectivity',
    ERROR_HANDLING: 'error-handling',
    PERFORMANCE: 'performance',
    USER_EXPERIENCE: 'user-experience',
    SECURITY: 'security',
  },
}));

describe('CheckRunner', () => {
  const mockRunQuickCheck = jest.fn();
  const mockRunFullCheck = jest.fn();
  const mockRunCustomCheck = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));
  });

  it('renders check runner buttons', () => {
    render(<CheckRunner />);

    expect(screen.getByText('Quick Check')).toBeInTheDocument();
    expect(screen.getByText('Full Check')).toBeInTheDocument();
    expect(screen.getByText('Custom Check')).toBeInTheDocument();
  });

  it('runs quick check when quick check button is clicked', async () => {
    render(<CheckRunner />);

    const quickCheckButton = screen.getByText('Quick Check');
    fireEvent.click(quickCheckButton);

    await waitFor(() => {
      expect(mockRunQuickCheck).toHaveBeenCalledTimes(1);
    });
  });

  it('runs full check when full check button is clicked', async () => {
    render(<CheckRunner />);

    const fullCheckButton = screen.getByText('Full Check');
    fireEvent.click(fullCheckButton);

    await waitFor(() => {
      expect(mockRunFullCheck).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state when check is running', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 5, total: 10, percentage: 50 },
        estimatedTimeRemaining: 30,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));

    render(<CheckRunner />);

    expect(screen.getByText('Running health check...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays error message when error occurs', () => {
    const errorMessage = 'Test error message';
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: false,
        progress: { completed: 0, total: 0, percentage: 0 },
        estimatedTimeRemaining: 0,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: errorMessage,
      }),
    }));

    render(<CheckRunner />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('opens custom check modal when custom check button is clicked', () => {
    render(<CheckRunner />);

    const customCheckButton = screen.getByText('Custom Check');
    fireEvent.click(customCheckButton);

    // Check if modal opens by looking for modal content
    expect(screen.getByText('Select Check Categories')).toBeInTheDocument();
  });

  it('allows selecting categories for custom check', () => {
    render(<CheckRunner />);

    const customCheckButton = screen.getByText('Custom Check');
    fireEvent.click(customCheckButton);

    // Check for category checkboxes
    expect(screen.getByText('API Connectivity')).toBeInTheDocument();
    expect(screen.getByText('Error Handling')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('shows estimated time remaining', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 3, total: 10, percentage: 30 },
        estimatedTimeRemaining: 120,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));

    render(<CheckRunner />);

    expect(screen.getByText('Estimated time remaining: 2 minutes')).toBeInTheDocument();
  });

  it('disables buttons during check execution', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 1, total: 10, percentage: 10 },
        estimatedTimeRemaining: 180,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));

    render(<CheckRunner />);

    expect(screen.getByText('Quick Check')).toBeDisabled();
    expect(screen.getByText('Full Check')).toBeDisabled();
    expect(screen.getByText('Custom Check')).toBeDisabled();
  });

  it('can cancel running check', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 2, total: 10, percentage: 20 },
        estimatedTimeRemaining: 150,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));

    render(<CheckRunner />);

    const cancelButton = screen.getByText('Cancel Check');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    // Test that cancel functionality works (would need to mock cancel function)
  });

  it('displays progress bar during check execution', () => {
    jest.doMock('@/hooks/useHealthCheck', () => ({
      useHealthCheckOperations: () => ({
        isRunning: true,
        progress: { completed: 7, total: 10, percentage: 70 },
        estimatedTimeRemaining: 45,
        runQuickCheck: mockRunQuickCheck,
        runFullCheck: mockRunFullCheck,
        runCustomCheck: mockRunCustomCheck,
        clearError: jest.fn(),
        error: null,
      }),
    }));

    render(<CheckRunner />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '70');
  });
});