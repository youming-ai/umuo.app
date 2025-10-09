import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import SettingsManager from './SettingsManager';

// Mock the hooks
jest.mock('@/hooks/useHealthCheckConfig', () => ({
  useHealthCheckConfig: () => ({
    configs: [
      {
        category: 'api-connectivity',
        enabled: true,
        timeout: 30000,
        retryCount: 3,
        severity: 'high',
      },
      {
        category: 'error-handling',
        enabled: true,
        timeout: 15000,
        retryCount: 2,
        severity: 'medium',
      },
    ],
    globalConfig: {
      autoRun: false,
      interval: 3600000,
      notifications: true,
      emailReports: false,
      retentionDays: 30,
    },
    updateCategoryConfig: jest.fn(),
    updateGlobalConfig: jest.fn(),
    refreshConfigs: jest.fn(),
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

describe('SettingsManager', () => {
  const mockUpdateCategoryConfig = jest.fn();
  const mockUpdateGlobalConfig = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings manager title', () => {
    render(<SettingsManager />);

    expect(screen.getByText('Health Check Settings')).toBeInTheDocument();
  });

  it('displays category settings', () => {
    render(<SettingsManager />);

    expect(screen.getByText('API Connectivity')).toBeInTheDocument();
    expect(screen.getByText('Error Handling')).toBeInTheDocument();
  });

  it('displays global settings', () => {
    render(<SettingsManager />);

    expect(screen.getByText('Global Configuration')).toBeInTheDocument();
    expect(screen.getByText('Auto-run Checks')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('can toggle category enabled state', async () => {
    render(<SettingsManager />);

    const apiConnectivityToggle = screen.getByLabelText('Enable API Connectivity');
    fireEvent.click(apiConnectivityToggle);

    await waitFor(() => {
      expect(mockUpdateCategoryConfig).toHaveBeenCalledWith('api-connectivity', {
        enabled: false,
        timeout: 30000,
        retryCount: 3,
        severity: 'high',
      });
    });
  });

  it('can update category timeout setting', async () => {
    render(<SettingsManager />);

    const timeoutInput = screen.getByLabelText('API Connectivity Timeout');
    fireEvent.change(timeoutInput, { target: { value: '60000' } });

    await waitFor(() => {
      expect(mockUpdateCategoryConfig).toHaveBeenCalledWith('api-connectivity', {
        enabled: true,
        timeout: 60000,
        retryCount: 3,
        severity: 'high',
      });
    });
  });

  it('can update category retry count', async () => {
    render(<SettingsManager />);

    const retryInput = screen.getByLabelText('Error Handling Retry Count');
    fireEvent.change(retryInput, { target: { value: '5' } });

    await waitFor(() => {
      expect(mockUpdateCategoryConfig).toHaveBeenCalledWith('error-handling', {
        enabled: true,
        timeout: 15000,
        retryCount: 5,
        severity: 'medium',
      });
    });
  });

  it('can change category severity level', async () => {
    render(<SettingsManager />);

    const severitySelect = screen.getByLabelText('Error Handling Severity');
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    await waitFor(() => {
      expect(mockUpdateCategoryConfig).toHaveBeenCalledWith('error-handling', {
        enabled: true,
        timeout: 15000,
        retryCount: 2,
        severity: 'high',
      });
    });
  });

  it('can toggle auto-run checks', async () => {
    render(<SettingsManager />);

    const autoRunToggle = screen.getByLabelText('Enable Auto-run Checks');
    fireEvent.click(autoRunToggle);

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({
        autoRun: true,
        interval: 3600000,
        notifications: true,
        emailReports: false,
        retentionDays: 30,
      });
    });
  });

  it('can update check interval', async () => {
    render(<SettingsManager />);

    const intervalInput = screen.getByLabelText('Check Interval');
    fireEvent.change(intervalInput, { target: { value: '7200000' } });

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({
        autoRun: false,
        interval: 7200000,
        notifications: true,
        emailReports: false,
        retentionDays: 30,
      });
    });
  });

  it('can toggle notifications', async () => {
    render(<SettingsManager />);

    const notificationsToggle = screen.getByLabelText('Enable Notifications');
    fireEvent.click(notificationsToggle);

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({
        autoRun: false,
        interval: 3600000,
        notifications: false,
        emailReports: false,
        retentionDays: 30,
      });
    });
  });

  it('can toggle email reports', async () => {
    render(<SettingsManager />);

    const emailReportsToggle = screen.getByLabelText('Enable Email Reports');
    fireEvent.click(emailReportsToggle);

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({
        autoRun: false,
        interval: 3600000,
        notifications: true,
        emailReports: true,
        retentionDays: 30,
      });
    });
  });

  it('can update retention days', async () => {
    render(<SettingsManager />);

    const retentionInput = screen.getByLabelText('Report Retention Days');
    fireEvent.change(retentionInput, { target: { value: '60' } });

    await waitFor(() => {
      expect(mockUpdateGlobalConfig).toHaveBeenCalledWith({
        autoRun: false,
        interval: 3600000,
        notifications: true,
        emailReports: false,
        retentionDays: 60,
      });
    });
  });

  it('shows save confirmation when settings are updated', async () => {
    render(<SettingsManager />);

    const autoRunToggle = screen.getByLabelText('Enable Auto-run Checks');
    fireEvent.click(autoRunToggle);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('validates timeout input values', async () => {
    render(<SettingsManager />);

    const timeoutInput = screen.getByLabelText('API Connectivity Timeout');
    fireEvent.change(timeoutInput, { target: { value: '1000' } }); // Too low

    await waitFor(() => {
      expect(screen.getByText('Timeout must be at least 5000ms')).toBeInTheDocument();
    });
  });

  it('validates retry count input values', async () => {
    render(<SettingsManager />);

    const retryInput = screen.getByLabelText('Error Handling Retry Count');
    fireEvent.change(retryInput, { target: { value: '0' } }); // Too low

    await waitFor(() => {
      expect(screen.getByText('Retry count must be at least 1')).toBeInTheDocument();
    });
  });

  it('validates interval input values', async () => {
    render(<SettingsManager />);

    const intervalInput = screen.getByLabelText('Check Interval');
    fireEvent.change(intervalInput, { target: { value: '60000' } }); // Too low (1 minute)

    await waitFor(() => {
      expect(screen.getByText('Interval must be at least 5 minutes')).toBeInTheDocument();
    });
  });

  it('can reset settings to defaults', async () => {
    render(<SettingsManager />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    // Confirm reset
    const confirmButton = screen.getByText('Reset');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateCategoryConfig).toHaveBeenCalledTimes(5); // For all 5 categories
      expect(mockUpdateGlobalConfig).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state while saving', async () => {
    const mockUpdateCategoryConfig = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    jest.doMock('@/hooks/useHealthCheckConfig', () => ({
      useHealthCheckConfig: () => ({
        configs: [
          {
            category: 'api-connectivity',
            enabled: true,
            timeout: 30000,
            retryCount: 3,
            severity: 'high',
          },
        ],
        globalConfig: {
          autoRun: false,
          interval: 3600000,
          notifications: true,
          emailReports: false,
          retentionDays: 30,
        },
        updateCategoryConfig: mockUpdateCategoryConfig,
        updateGlobalConfig: jest.fn(),
        refreshConfigs: jest.fn(),
      }),
    }));

    render(<SettingsManager />);

    const apiConnectivityToggle = screen.getByLabelText('Enable API Connectivity');
    fireEvent.click(apiConnectivityToggle);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('handles save errors gracefully', async () => {
    const mockUpdateCategoryConfig = jest.fn(() => Promise.reject(new Error('Save failed')));
    jest.doMock('@/hooks/useHealthCheckConfig', () => ({
      useHealthCheckConfig: () => ({
        configs: [
          {
            category: 'api-connectivity',
            enabled: true,
            timeout: 30000,
            retryCount: 3,
            severity: 'high',
          },
        ],
        globalConfig: {
          autoRun: false,
          interval: 3600000,
          notifications: true,
          emailReports: false,
          retentionDays: 30,
        },
        updateCategoryConfig: mockUpdateCategoryConfig,
        updateGlobalConfig: jest.fn(),
        refreshConfigs: jest.fn(),
      }),
    }));

    render(<SettingsManager />);

    const apiConnectivityToggle = screen.getByLabelText('Enable API Connectivity');
    fireEvent.click(apiConnectivityToggle);

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
    });
  });

  it('can export settings', async () => {
    render(<SettingsManager />);

    const exportButton = screen.getByText('Export Settings');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Settings exported successfully')).toBeInTheDocument();
    });
  });

  it('can import settings', async () => {
    render(<SettingsManager />);

    const importButton = screen.getByText('Import Settings');
    fireEvent.click(importButton);

    const fileInput = screen.getByLabelText('Upload settings file');
    const file = new File(['{"test": "data"}'], 'settings.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('Settings imported successfully')).toBeInTheDocument();
    });
  });

  it('displays settings descriptions', () => {
    render(<SettingsManager />);

    expect(screen.getByText(/Automatically run health checks at regular intervals/)).toBeInTheDocument();
    expect(screen.getByText(/Show notifications for health check results/)).toBeInTheDocument();
    expect(screen.getByText(/Send email reports with health check summaries/)).toBeInTheDocument();
    expect(screen.getByText(/Number of days to retain health check reports/)).toBeInTheDocument();
  });

  it('switches between category and global settings tabs', async () => {
    render(<SettingsManager />);

    const globalTab = screen.getByText('Global Settings');
    fireEvent.click(globalTab);

    await waitFor(() => {
      expect(screen.getByText('Global Configuration')).toBeInTheDocument();
    });

    const categoriesTab = screen.getByText('Category Settings');
    fireEvent.click(categoriesTab);

    await waitFor(() => {
      expect(screen.getByText('API Connectivity')).toBeInTheDocument();
    });
  });
});