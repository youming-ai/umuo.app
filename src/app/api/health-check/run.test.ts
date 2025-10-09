import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/health-check/scheduler', () => ({
  runHealthCheck: jest.fn(),
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

import { runHealthCheck } from '@/lib/health-check/scheduler';
import { apiSuccess, apiError } from '@/lib/api-response';

describe('POST /api/health-check/run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a health check with default config', async () => {
    // Arrange
    const mockCheckId = 'check-123';
    const mockDuration = 180; // 3 minutes

    (runHealthCheck as jest.Mock).mockResolvedValue({
      checkId: mockCheckId,
      estimatedDuration: mockDuration,
    });

    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(runHealthCheck).toHaveBeenCalledWith({});
    expect(apiSuccess).toHaveBeenCalledWith({
      checkId: mockCheckId,
      status: 'started',
      estimatedDuration: mockDuration,
    });
    expect(result.success).toBe(true);
    expect(result.data.checkId).toBe(mockCheckId);
    expect(result.data.status).toBe('started');
  });

  it('should start a health check with custom categories', async () => {
    // Arrange
    const mockCheckId = 'check-456';
    const categories = ['api_connectivity', 'performance'];

    (runHealthCheck as jest.Mock).mockResolvedValue({
      checkId: mockCheckId,
      estimatedDuration: 120,
    });

    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categories,
      }),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(runHealthCheck).toHaveBeenCalledWith({
      categories,
    });
    expect(result.success).toBe(true);
    expect(result.data.checkId).toBe(mockCheckId);
  });

  it('should start a health check with custom config', async () => {
    // Arrange
    const mockCheckId = 'check-789';
    const config = {
      timeout: 600000, // 10 minutes
      retryCount: 3,
      parallel: true,
    };

    (runHealthCheck as jest.Mock).mockResolvedValue({
      checkId: mockCheckId,
      estimatedDuration: 240,
    });

    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config,
      }),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(runHealthCheck).toHaveBeenCalledWith({
      config,
    });
    expect(result.success).toBe(true);
    expect(result.data.checkId).toBe(mockCheckId);
  });

  it('should handle invalid JSON in request body', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_REQUEST',
        message: expect.stringContaining('Invalid JSON'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should handle scheduler errors', async () => {
    // Arrange
    const errorMessage = 'Scheduler service unavailable';

    (runHealthCheck as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Act
    const response = await POST(request);
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

  it('should validate timeout config is within acceptable range', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          timeout: 1000, // Too low (1 second)
        },
      }),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('timeout'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should validate retry count is within acceptable range', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          retryCount: 10, // Too high
        },
      }),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('retryCount'),
      })
    );
    expect(result.success).toBe(false);
  });
});