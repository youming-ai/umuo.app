import { PUT, GET } from './route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/health-check/database', () => ({
  healthCheckDB: {
    checkConfigs: {
      toArray: jest.fn(),
      bulkPut: jest.fn(),
      clear: jest.fn(),
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
import { CheckCategory, HealthCheckConfig } from '@/lib/health-check/types';

describe('PUT /api/health-check/config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update health check config successfully', async () => {
    // Arrange
    const mockExistingConfigs: HealthCheckConfig[] = [
      {
        category: CheckCategory.API_CONNECTIVITY,
        enabled: true,
        timeout: 30000,
        retryCount: 3,
        severity: 'high' as any,
      },
      {
        category: CheckCategory.PERFORMANCE,
        enabled: true,
        timeout: 60000,
        retryCount: 2,
        severity: 'medium' as any,
      },
    ];

    const mockUpdatedConfig = {
      categories: [
        {
          category: CheckCategory.API_CONNECTIVITY,
          enabled: false, // Changed to false
          timeout: 45000, // Increased timeout
        },
        {
          category: CheckCategory.SECURITY, // New category
          enabled: true,
          timeout: 30000,
          retryCount: 1,
          severity: 'critical' as any,
        },
      ],
      global: {
        autoRun: true,
        interval: 3600000, // 1 hour
        notifications: true,
      },
    };

    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockResolvedValue(mockExistingConfigs);
    (healthCheckDB.checkConfigs.bulkPut as jest.Mock).mockResolvedValue(undefined);
    (healthCheckDB.checkConfigs.clear as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockUpdatedConfig),
    });

    // Act
    const response = await PUT(request);
    const result = await response.json();

    // Assert
    expect(healthCheckDB.checkConfigs.clear).toHaveBeenCalled();
    expect(healthCheckDB.checkConfigs.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          category: CheckCategory.API_CONNECTIVITY,
          enabled: false,
          timeout: 45000,
        }),
        expect.objectContaining({
          category: CheckCategory.SECURITY,
          enabled: true,
          timeout: 30000,
        }),
      ])
    );
    expect(apiSuccess).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          category: CheckCategory.API_CONNECTIVITY,
          enabled: false,
          timeout: 45000,
        }),
      ])
    );
    expect(result.success).toBe(true);
  });

  it('should handle partial config updates', async () => {
    // Arrange
    const mockExistingConfigs: HealthCheckConfig[] = [
      {
        category: CheckCategory.ERROR_HANDLING,
        enabled: true,
        timeout: 30000,
        retryCount: 3,
        severity: 'medium' as any,
      },
    ];

    const mockPartialUpdate = {
      categories: [
        {
          category: CheckCategory.ERROR_HANDLING,
          enabled: false, // Only update enabled status
        },
      ],
    };

    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockResolvedValue(mockExistingConfigs);
    (healthCheckDB.checkConfigs.bulkPut as jest.Mock).mockResolvedValue(undefined);
    (healthCheckDB.checkConfigs.clear as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockPartialUpdate),
    });

    // Act
    const response = await PUT(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: CheckCategory.ERROR_HANDLING,
          enabled: false,
          timeout: 30000, // Should remain unchanged
          retryCount: 3, // Should remain unchanged
        }),
      ])
    );
  });

  it('should validate timeout config is within acceptable range', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categories: [
          {
            category: CheckCategory.API_CONNECTIVITY,
            timeout: 100, // Too low (100ms)
          },
        ],
      }),
    });

    // Act
    const response = await PUT(request);
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
    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categories: [
          {
            category: CheckCategory.API_CONNECTIVITY,
            retryCount: 10, // Too high
          },
        ],
      }),
    });

    // Act
    const response = await PUT(request);
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

  it('should validate global interval is within acceptable range', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        global: {
          interval: 30000, // Too low (30 seconds)
        },
      }),
    });

    // Act
    const response = await PUT(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('interval'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('should handle invalid JSON in request body', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    // Act
    const response = await PUT(request);
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

  it('should handle database errors gracefully', async () => {
    // Arrange
    const errorMessage = 'Database update failed';
    const mockConfigUpdate = {
      categories: [
        {
          category: CheckCategory.API_CONNECTIVITY,
          enabled: true,
        },
      ],
    };

    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockConfigUpdate),
    });

    // Act
    const response = await PUT(request);
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

  it('should validate category enum values', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/health-check/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categories: [
          {
            category: 'invalid_category', // Invalid enum value
            enabled: true,
          },
        ],
      }),
    });

    // Act
    const response = await PUT(request);
    const result = await response.json();

    // Assert
    expect(apiError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('category'),
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('GET /api/health-check/config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return current health check config', async () => {
    // Arrange
    const mockConfigs: HealthCheckConfig[] = [
      {
        category: CheckCategory.API_CONNECTIVITY,
        enabled: true,
        timeout: 30000,
        retryCount: 3,
        severity: 'high' as any,
        schedule: {
          interval: 3600000,
          autoRun: true,
        },
      },
      {
        category: CheckCategory.PERFORMANCE,
        enabled: false,
        timeout: 60000,
        retryCount: 2,
        severity: 'medium' as any,
      },
    ];

    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockResolvedValue(mockConfigs);

    const request = new NextRequest('http://localhost:3000/api/health-check/config');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(apiSuccess).toHaveBeenCalledWith({
      categories: mockConfigs,
      global: {
        autoRun: true,
        interval: 3600000,
        notifications: false, // Default value
      },
    });
    expect(result.success).toBe(true);
    expect(result.data.categories).toHaveLength(2);
  });

  it('should handle empty config gracefully', async () => {
    // Arrange
    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/health-check/config');

    // Act
    const response = await GET(request);
    const result = await response.json();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.categories).toHaveLength(0);
    expect(result.data.global).toEqual({
      autoRun: false,
      interval: 86400000, // Default 24 hours
      notifications: false,
    });
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const errorMessage = 'Database query failed';
    (healthCheckDB.checkConfigs.toArray as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest('http://localhost:3000/api/health-check/config');

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
});