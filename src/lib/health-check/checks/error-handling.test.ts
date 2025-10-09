import { checkErrorHandling } from './error-handling';
import { HealthCheckResult, CheckCategory, CheckStatus, SeverityLevel } from '@/lib/health-check/types';
import { enhancedGroqClient } from '@/lib/enhanced-groq-client';

// Mock the enhanced Groq client
jest.mock('@/lib/enhanced-groq-client', () => ({
  enhancedGroqClient: {
    getStats: jest.fn(),
    simulateError: jest.fn(),
  },
}));

import { enhancedGroqClient as mockGroqClient } from '@/lib/enhanced-groq-client';

describe('Error Handling Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass when all error handling mechanisms are working correctly', async () => {
    // Arrange
    const mockStats = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 250,
      errorDistribution: {
        'AUTH_ERROR': 2,
        'RATE_LIMIT_ERROR': 1,
        'VALIDATION_ERROR': 1,
        'TIMEOUT_ERROR': 1,
      },
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Test auth error handled',
        userFriendlyMessage: 'Authentication failed. Please check your API key.',
        recoverySteps: ['Check API key configuration', 'Verify account status']
      })
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Test rate limit handled',
        userFriendlyMessage: 'Rate limit exceeded. Please try again later.',
        recoverySteps: ['Wait before retrying', 'Consider upgrading plan']
      })
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Test validation error handled',
        userFriendlyMessage: 'Invalid request format. Please check your input.',
        recoverySteps: ['Verify request format', 'Check required parameters']
      });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      category: CheckCategory.ERROR_HANDLING,
      name: 'Error Handling Validation',
      status: CheckStatus.PASSED,
      severity: SeverityLevel.LOW,
      message: 'All error handling mechanisms are working correctly',
      duration: expect.any(Number),
      timestamp: expect.any(Date),
    });

    expect(result.details).toMatchObject({
      totalErrorTypes: 3,
      errorsHandledCorrectly: 3,
      errorRecoveryRate: 1.0,
      userFriendlyMessages: 3,
      recoveryStepsProvided: 6,
    });

    expect(result.metrics).toMatchObject({
      apiSuccessRate: 0.95,
      averageResponseTime: 250,
      errorTypesHandled: ['AUTH_ERROR', 'RATE_LIMIT_ERROR', 'VALIDATION_ERROR'],
    });

    expect(mockGroqClient.simulateError).toHaveBeenCalledTimes(3);
  });

  it('should detect missing user-friendly error messages', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 50,
      successfulRequests: 45,
      failedRequests: 5,
      averageResponseTime: 300,
      errorDistribution: {
        'AUTH_ERROR': 2,
        'VALIDATION_ERROR': 3,
      },
    });

    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Auth error',
        userFriendlyMessage: '', // Missing user-friendly message
        recoverySteps: []
      })
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Validation error',
        userFriendlyMessage: 'Invalid input', // Has user-friendly message
        recoverySteps: ['Check input format']
      });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('user-friendly error messages');
    expect(result.details.errorsWithoutUserFriendlyMessages).toBe(1);
    expect(result.suggestions).toContain(
      expect.stringContaining('user-friendly error messages')
    );
  });

  it('should detect missing recovery steps', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 30,
      successfulRequests: 25,
      failedRequests: 5,
      averageResponseTime: 200,
      errorDistribution: {
        'TIMEOUT_ERROR': 3,
        'NETWORK_ERROR': 2,
      },
    });

    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Timeout error',
        userFriendlyMessage: 'Request timed out. Please try again.',
        recoverySteps: [] // Missing recovery steps
      })
      .mockResolvedValueOnce({
        success: true,
        errorHandled: true,
        errorMessage: 'Network error',
        userFriendlyMessage: 'Network connection failed.',
        recoverySteps: ['Check internet connection', 'Try again later']
      });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('recovery steps');
    expect(result.details.errorsWithoutRecoverySteps).toBe(1);
    expect(result.suggestions).toContain(
      expect.stringContaining('recovery steps')
    );
  });

  it('should fail when error handling is not working', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 20,
      successfulRequests: 15,
      failedRequests: 5,
      averageResponseTime: 400,
      errorDistribution: {
        'INTERNAL_ERROR': 5,
      },
    });

    (mockGroqClient.simulateError as jest.Mock).mockResolvedValue({
      success: false,
      errorHandled: false,
      errorMessage: 'Internal error not handled',
      userFriendlyMessage: '',
      recoverySteps: [],
    });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('Error handling is not working properly');
    expect(result.details.errorHandlingFailures).toBe(1);
    expect(result.error).toBeDefined();
    expect(result.suggestions).toContain(
      expect.stringContaining('critical error handling issues')
    );
  });

  it('should handle client errors gracefully', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockRejectedValue(new Error('Client unavailable'));

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('Failed to validate error handling');
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Client unavailable');
  });

  it('should provide detailed metrics for error handling performance', async () => {
    // Arrange
    const mockStats = {
      totalRequests: 200,
      successfulRequests: 180,
      failedRequests: 20,
      averageResponseTime: 180,
      errorDistribution: {
        'AUTH_ERROR': 8,
        'RATE_LIMIT_ERROR': 6,
        'VALIDATION_ERROR': 4,
        'TIMEOUT_ERROR': 2,
      },
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Auth failed', recoverySteps: ['Check API key'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Rate limited', recoverySteps: ['Wait and retry'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Invalid input', recoverySteps: ['Check format'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Timeout', recoverySteps: ['Try again'] });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.metrics).toMatchObject({
      apiSuccessRate: 0.9,
      averageResponseTime: 180,
      errorTypesHandled: ['AUTH_ERROR', 'RATE_LIMIT_ERROR', 'VALIDATION_ERROR', 'TIMEOUT_ERROR'],
      errorRecoveryRate: 1.0,
      averageRecoverySteps: 1.0,
    });

    expect(result.details).toMatchObject({
      totalErrorTypes: 4,
      errorsHandledCorrectly: 4,
      errorRecoveryRate: 1.0,
      userFriendlyMessages: 4,
      recoveryStepsProvided: 4,
    });
  });

  it('should detect high error rates', async () => {
    // Arrange
    const mockStats = {
      totalRequests: 100,
      successfulRequests: 70, // 70% success rate is low
      failedRequests: 30,
      averageResponseTime: 500,
      errorDistribution: {
        'AUTH_ERROR': 15,
        'RATE_LIMIT_ERROR': 10,
        'TIMEOUT_ERROR': 5,
      },
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Auth failed', recoverySteps: ['Check key'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Rate limited', recoverySteps: ['Wait'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Timeout', recoverySteps: ['Retry'] });

    // Act
    const result = await checkErrorHandling();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('high error rate');
    expect(result.details.apiSuccessRate).toBe(0.7);
    expect(result.suggestions).toContain(
      expect.stringContaining('high error rate')
    );
  });

  it('should complete within acceptable time limits', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 50,
      successfulRequests: 48,
      failedRequests: 2,
      averageResponseTime: 200,
      errorDistribution: {
        'AUTH_ERROR': 1,
        'VALIDATION_ERROR': 1,
      },
    });

    (mockGroqClient.simulateError as jest.Mock)
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Auth failed', recoverySteps: ['Check key'] })
      .mockResolvedValue({ success: true, errorHandled: true, userFriendlyMessage: 'Invalid input', recoverySteps: ['Check format'] });

    const startTime = Date.now();

    // Act
    const result = await checkErrorHandling();
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    expect(result.duration).toBeLessThan(10000);
    expect(result.status).toBe(CheckStatus.PASSED);
  });
});