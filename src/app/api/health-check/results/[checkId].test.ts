import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/health-check/database', () => ({
  getCheckReport: jest.fn(),
}));

jest.mock('@/lib/api-response', () => ({
  apiSuccess: jest.fn((data) => ({
    success: true,
    data,
  })),
  apiError: jest.fn((error) => ({
    success: false,
    error,
  })),
}));

import { getCheckReport } from '@/lib/health-check/database';
import { apiSuccess, apiError } from '@/lib/api-response';
import { HealthCheckReport, CheckStatus } from '@/lib/health-check/types';

describe('GET /api/health-check/results/[checkId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return health check report for existing check', async () => {
    // Arrange
    const checkId = 'report-123';
    const mockReport: HealthCheckReport = {
      id: checkId,
      version: '1.0',
      timestamp: new Date(),
      duration: 180000,
      summary: {
        total: 6,
        passed: 4,
        failed: 1,
        warnings: 1,
        skipped: 0,
        overallStatus: CheckStatus.WARNING,
        score: 75,
      },
      results: [],
      issues: [],
      recommendations: [],
      systemInfo: {
        userAgent: 'Mozilla/5.0...',
        platform: 'Web',
        language: 'en',
        timeZone: 'UTC',
      },
      metadata: {
        version: '1.0.0',
        environment: 'production',
      },
    };

    (getCheckReport as jest.Mock).mockResolvedValue(mockReport);

    const request = new NextRequest(`http://localhost:3000/api/health-check/results/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(getCheckReport).toHaveBeenCalledWith(checkId);
    expect(apiSuccess).toHaveBeenCalledWith(mockReport);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(checkId);
    expect(result.data.summary.score).toBe(75);
    expect(result.data.summary.overallStatus).toBe(CheckStatus.WARNING);
  });

  it('should return 404 for non-existent report', async () => {
    // Arrange
    const checkId = 'non-existent-report';

    (getCheckReport as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/health-check/results/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
      })
    );
    expect(result.success).toBe(false);
  });
});