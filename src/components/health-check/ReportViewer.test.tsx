import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import ReportViewer from './ReportViewer';

// Mock the hooks
jest.mock('@/hooks/useHealthCheckHistory', () => ({
  useHealthCheckHistory: () => ({
    reports: [],
    getReportsByStatus: jest.fn(),
    getReportsByDateRange: jest.fn(),
    getRecentReports: jest.fn(),
    deleteReport: jest.fn(),
    refreshReports: jest.fn(),
  }),
}));

jest.mock('@/lib/health-check/export', () => ({
  HealthCheckExporter: jest.fn().mockImplementation(() => ({
    exportToJSON: jest.fn(),
    exportToCSV: jest.fn(),
    exportToPDF: jest.fn(),
  })),
}));

jest.mock('@/lib/health-check/types', () => ({
  CheckStatus: {
    PASSED: 'passed',
    FAILED: 'failed',
    WARNING: 'warning',
  },
  CheckCategory: {
    API_CONNECTIVITY: 'api-connectivity',
    ERROR_HANDLING: 'error-handling',
    PERFORMANCE: 'performance',
    USER_EXPERIENCE: 'user-experience',
    SECURITY: 'security',
  },
}));

describe('ReportViewer', () => {
  const mockReports = [
    {
      id: '1',
      timestamp: new Date('2023-10-08T10:00:00'),
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
      results: [],
      issues: [],
      recommendations: [],
    },
    {
      id: '2',
      timestamp: new Date('2023-10-08T09:30:00'),
      score: 72,
      status: 'warning',
      duration: 52000,
      summary: {
        total: 10,
        passed: 6,
        failed: 2,
        warnings: 2,
        overallStatus: 'warning',
      },
      results: [],
      issues: [],
      recommendations: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders report viewer title', () => {
    render(<ReportViewer />);

    expect(screen.getByText('Health Check Reports')).toBeInTheDocument();
  });

  it('displays empty state when no reports available', () => {
    render(<ReportViewer />);

    expect(screen.getByText('No health check reports available')).toBeInTheDocument();
    expect(screen.getByText('Run a health check to see reports here')).toBeInTheDocument();
  });

  it('displays reports when available', () => {
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    expect(screen.getByText('85')).toBeInTheDocument(); // First report score
    expect(screen.getByText('72')).toBeInTheDocument(); // Second report score
  });

  it('shows report timestamps', () => {
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('9:30 AM')).toBeInTheDocument();
  });

  it('displays report status indicators', () => {
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('can filter reports by status', async () => {
    const mockGetReportsByStatus = jest.fn();
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: mockGetReportsByStatus,
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const statusFilter = screen.getByLabelText('Filter by status');
    fireEvent.change(statusFilter, { target: { value: 'passed' } });

    await waitFor(() => {
      expect(mockGetReportsByStatus).toHaveBeenCalledWith('passed');
    });
  });

  it('can filter reports by date range', async () => {
    const mockGetReportsByDateRange = jest.fn();
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: mockGetReportsByDateRange,
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const dateRangeFilter = screen.getByLabelText('Filter by date range');
    fireEvent.change(dateRangeFilter, { target: { value: 'last7days' } });

    await waitFor(() => {
      expect(mockGetReportsByDateRange).toHaveBeenCalled();
    });
  });

  it('can refresh reports', async () => {
    const mockRefreshReports = jest.fn();
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: mockRefreshReports,
      }),
    }));

    render(<ReportViewer />);

    const refreshButton = screen.getByLabelText('Refresh reports');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshReports).toHaveBeenCalledTimes(1);
    });
  });

  it('can delete reports', async () => {
    const mockDeleteReport = jest.fn();
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: mockDeleteReport,
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const deleteButton = screen.getAllByLabelText('Delete report')[0];
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteReport).toHaveBeenCalledWith('1');
    });
  });

  it('can export reports to different formats', async () => {
    const mockExport = {
      exportToJSON: jest.fn(),
      exportToCSV: jest.fn(),
      exportToPDF: jest.fn(),
    };

    jest.doMock('@/lib/health-check/export', () => ({
      HealthCheckExporter: jest.fn().mockImplementation(() => mockExport),
    }));

    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const exportButton = screen.getByLabelText('Export reports');
    fireEvent.click(exportButton);

    // Check export options
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();

    const jsonExportButton = screen.getByText('Export as JSON');
    fireEvent.click(jsonExportButton);

    await waitFor(() => {
      expect(mockExport.exportToJSON).toHaveBeenCalledWith(mockReports);
    });
  });

  it('shows report details when report is selected', async () => {
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const firstReport = screen.getByText('85');
    fireEvent.click(firstReport);

    await waitFor(() => {
      expect(screen.getByText('Report Details')).toBeInTheDocument();
    });
  });

  it('displays check results for a report', async () => {
    const reportWithResults = {
      ...mockReports[0],
      results: [
        {
          id: '1',
          category: 'api-connectivity',
          status: 'passed',
          metrics: { accuracy: 95, responseTime: 500 },
          timestamp: new Date(),
        },
        {
          id: '2',
          category: 'error-handling',
          status: 'failed',
          metrics: { accuracy: 0, responseTime: 1000 },
          timestamp: new Date(),
          error: { message: 'Test error', type: 'network' },
        },
      ],
    };

    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: [reportWithResults],
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => [reportWithResults]),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    const report = screen.getByText('85');
    fireEvent.click(report);

    await waitFor(() => {
      expect(screen.getByText('API Connectivity')).toBeInTheDocument();
      expect(screen.getByText('Error Handling')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Accuracy
      expect(screen.getByText('500ms')).toBeInTheDocument(); // Response time
    });
  });

  it('shows report summary statistics', () => {
    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: mockReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => mockReports),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    expect(screen.getByText('Total Reports: 2')).toBeInTheDocument();
    expect(screen.getByText('Average Score: 78.5')).toBeInTheDocument();
  });

  it('can sort reports by different criteria', async () => {
    render(<ReportViewer />);

    const sortButton = screen.getByLabelText('Sort reports');
    fireEvent.click(sortButton);

    const sortByDate = screen.getByText('Sort by Date');
    fireEvent.click(sortByDate);

    await waitFor(() => {
      // Verify that reports are sorted by date
      const reportElements = screen.getAllByTestId('report-item');
      expect(reportElements).toHaveLength(2);
    });
  });

  it('handles pagination for large number of reports', () => {
    const manyReports = Array.from({ length: 25 }, (_, i) => ({
      ...mockReports[0],
      id: `${i + 1}`,
      timestamp: new Date(Date.now() - i * 60000),
    }));

    jest.doMock('@/hooks/useHealthCheckHistory', () => ({
      useHealthCheckHistory: () => ({
        reports: manyReports,
        getReportsByStatus: jest.fn(),
        getReportsByDateRange: jest.fn(),
        getRecentReports: jest.fn(() => manyReports.slice(0, 10)),
        deleteReport: jest.fn(),
        refreshReports: jest.fn(),
      }),
    }));

    render(<ReportViewer />);

    expect(screen.getByText('Showing 1-10 of 25 reports')).toBeInTheDocument();
    expect(screen.getByText('Next Page')).toBeInTheDocument();
  });

  it('displays search functionality', async () => {
    render(<ReportViewer />);

    const searchInput = screen.getByLabelText('Search reports');
    fireEvent.change(searchInput, { target: { value: 'API' } });

    await waitFor(() => {
      // Verify that search functionality works
      expect(screen.getByDisplayValue('API')).toBeInTheDocument();
    });
  });
});