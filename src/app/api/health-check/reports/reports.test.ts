import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/health-check/database', () => ({
  healthCheckDB: {
    checkReports: {
      orderBy: jest.fn(),
      offset: jest.fn(),
      limit: jest.fn(),
      toArray: jest.fn(),
    },
  },
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

import { healthCheckDB } from '@/lib/health-check/database';
import { apiSuccess, apiError } from '@/lib/api-response';
import { CheckStatus, CheckCategory } from '@/lib/health-check/types';

describe('GET /api/health-check/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated reports with default parameters', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'report-1',
        timestamp: new Date('2025-10-01T10:00:00Z'),
        summary: { overallStatus: CheckStatus.PASSED, score: 90 },
      },
      {
        id: 'report-2',
        timestamp: new Date('2025-10-02T10:00:00Z'),
        summary: { overallStatus: CheckStatus.WARNING, score: 75 },
      },
    ];

    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue(mockReports) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    // Mock total count
    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue({
      reverse: jest.fn().mockReturnValue({
        offset: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockReports),
          }),
        }),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/health-check/reports');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(apiSuccess).toHaveBeenCalledWith({
      reports: mockReports,
      pagination: {
        total: expect.any(Number),
        limit: 10,
        offset: 0,
        hasMore: false,
      },
    });
    expect(result.success).toBe(true);
    expect(result.data.reports).toHaveLength(2);
  });

  it('should handle custom pagination parameters', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'report-3',
        timestamp: new Date('2025-10-03T10:00:00Z'),
        summary: { overallStatus: CheckStatus.FAILED, score: 45 },
      },
    ];

    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue(mockReports) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest('http://localhost:3000/api/health-check/reports?limit=5&offset=10');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(healthCheckDB.checkReports.orderBy).toHaveBeenCalledWith('timestamp');
    expect(mockReverse.offset).toHaveBeenCalledWith(10);
    expect(mockOffset.limit).toHaveBeenCalledWith(5);
    expect(result.success).toBe(true);
    expect(result.data.pagination.limit).toBe(5);
    expect(result.data.pagination.offset).toBe(10);
  });

  it('should filter by category when provided', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'report-4',
        timestamp: new Date('2025-10-04T10:00:00Z'),
        summary: { overallStatus: CheckStatus.PASSED, score: 95 },
        results: [
          { category: CheckCategory.API_CONNECTIVITY, status: CheckStatus.PASSED },
        ],
      },
    ];

    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue(mockReports) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest(
      'http://localhost:3000/api/health-check/reports?category=api_connectivity'
    );

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              category: CheckCategory.API_CONNECTIVITY,
            }),
          ]),
        }),
      ])
    );
  });

  it('should filter by status when provided', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'report-5',
        timestamp: new Date('2025-10-05T10:00:00Z'),
        summary: { overallStatus: CheckStatus.FAILED, score: 30 },
      },
    ];

    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue(mockReports) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest(
      'http://localhost:3000/api/health-check/reports?status=failed'
    );

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.objectContaining({
            overallStatus: CheckStatus.FAILED,
          }),
        }),
      ])
    );
  });

  it('should filter by date range when provided', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'report-6',
        timestamp: new Date('2025-10-06T10:00:00Z'),
        summary: { overallStatus: CheckStatus.PASSED, score: 88 },
      },
    ];

    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue(mockReports) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest(
      'http://localhost:3000/api/health-check/reports?dateFrom=2025-10-05T00:00:00Z&dateTo=2025-10-07T23:59:59Z'
    );

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      ])
    );
  });

  it('should validate limit parameter is within acceptable range', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/reports?limit=1000');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('limit'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should validate offset parameter is non-negative', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/reports?offset=-1');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('offset'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const errorMessage = 'Database connection failed';
    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockRejectedValue(new Error(errorMessage)) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest('http://localhost:3000/api/health-check/reports');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      })
    );
    expect(result.success).toBe(false);
  });

  it('should return empty array when no reports found', async () => {
    // Arrange
    const mockOrderBy = { reverse: jest.fn() };
    const mockReverse = { offset: jest.fn() };
    const mockOffset = { limit: jest.fn() };
    const mockLimit = { toArray: jest.fn().mockResolvedValue([]) };

    (healthCheckDB.checkReports.orderBy as jest.Mock).mockReturnValue(mockOrderBy);
    (mockOrderBy.reverse as jest.Mock).mockReturnValue(mockReverse);
    (mockReverse.offset as jest.Mock).mockReturnValue(mockOffset);
    (mockOffset.limit as jest.Mock).mockReturnValue(mockLimit);

    const request = new NextRequest('http://localhost:3000/api/health-check/reports');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.reports).toHaveLength(0);
    expect(result.data.pagination.total).toBe(0);
  });
});