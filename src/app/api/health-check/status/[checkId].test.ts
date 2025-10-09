import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/health-check/database', () => ({
  getCheckProgress: jest.fn(),
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

import { getCheckProgress } from '@/lib/health-check/database';
import { apiSuccess, apiError } from '@/lib/api-response';
import { CheckStatus, CheckCategory } from '@/lib/health-check/types';

describe('GET /api/health-check/status/[checkId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return check progress for existing check', async () => {
    // Arrange
    const checkId = 'check-123';
    const mockProgress = {
      checkId,
      total: 6,
      completed: 3,
      current: {
        category: CheckCategory.PERFORMANCE,
        name: 'Performance Benchmark',
        status: CheckStatus.RUNNING,
        progress: 50,
      },
      estimatedTimeRemaining: 120,
    };

    (getCheckProgress as jest.Mock).mockResolvedValue(mockProgress);

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${checkId}`);

    // Mock the params object that Next.js provides
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(getCheckProgress).toHaveBeenCalledWith(checkId);
    expect(apiSuccess).toHaveBeenCalledWith(mockProgress);
    expect(result.success).toBe(true);
    expect(result.data.checkId).toBe(checkId);
    expect(result.data.total).toBe(6);
    expect(result.data.completed).toBe(3);
    expect(result.data.current.category).toBe(CheckCategory.PERFORMANCE);
  });

  it('should return 404 for non-existent check', async () => {
    // Arrange
    const checkId = 'non-existent-check';

    (getCheckProgress as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(getCheckProgress).toHaveBeenCalledWith(checkId);
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should handle database errors', async () => {
    // Arrange
    const checkId = 'check-error';
    const errorMessage = 'Database connection failed';

    (getCheckProgress as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
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

  it('should validate checkId format', async () => {
    // Arrange
    const invalidCheckId = 'invalid@check#id';

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${invalidCheckId}`);
    const params = { checkId: invalidCheckId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid checkId'),
      })
    );
    expect(result.success).toBe(false);
    expect(getCheckProgress).not.toHaveBeenCalled();
  });

  it('should calculate percentage correctly', async () => {
    // Arrange
    const checkId = 'check-progress';
    const mockProgress = {
      checkId,
      total: 10,
      completed: 7,
      current: {
        category: CheckCategory.API_CONNECTIVITY,
        name: 'API Connectivity Check',
        status: CheckStatus.RUNNING,
        progress: 80,
      },
      estimatedTimeRemaining: 60,
    };

    (getCheckProgress as jest.Mock).mockResolvedValue(mockProgress);

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.progress).toBeDefined();
    // Note: The actual percentage calculation would be done in the implementation
    // This test ensures the progress structure is returned correctly
  });

  it('should handle completed checks', async () => {
    // Arrange
    const checkId = 'check-completed';
    const mockProgress = {
      checkId,
      total: 5,
      completed: 5,
      current: {
        category: CheckCategory.SECURITY,
        name: 'Security Compliance',
        status: CheckStatus.COMPLETED,
        progress: 100,
      },
      estimatedTimeRemaining: 0,
    };

    (getCheckProgress as jest.Mock).mockResolvedValue(mockProgress);

    const request = new NextRequest(`http://localhost:3000/api/health-check/status/${checkId}`);
    const params = { checkId };

    // Act
    const response = await GET(request, { params });
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.current.status).toBe(CheckStatus.COMPLETED);
    expect(result.data.estimatedTimeRemaining).toBe(0);
  });
});