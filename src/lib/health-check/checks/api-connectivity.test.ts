import { checkApiConnectivity } from './api-connectivity';
import { CheckStatus, CheckCategory, SeverityLevel } from '@/lib/health-check/types';

// Mock external dependencies
jest.mock('@/lib/enhanced-groq-client', () => ({
  enhancedGroqClient: {
    healthCheck: jest.fn(),
    getUsageStats: jest.fn(),
  },
}));

import { enhancedGroqClient } from '@/lib/enhanced-groq-client';

describe('API Connectivity Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass when all API services are healthy', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      status: 'healthy',
      message: 'Groq service is healthy',
    });

    (enhancedGroqClient.getUsageStats as jest.Mock).mockReturnValue({
      requestCount: 100,
      errorCount: 2,
      errorRate: 0.02,
    });

    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      connected: true,
      responseTime: 150,
      model: 'whisper-large-v3-turbo',
    });

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.category).toBe(CheckCategory.API_CONNECTIVITY);
    expect(result.status).toBe(CheckStatus.PASSED);
    expect(result.message).toContain('All API services are healthy');
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.apiResponseTime).toBeLessThan(2000);
    expect(result.metrics?.apiSuccessRate).toBeGreaterThan(0.95);
  });

  it('should fail with critical severity when Groq API is down', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      status: 'unhealthy',
      message: 'API key invalid',
    });

    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      connected: false,
      error: 'Service unavailable',
    });

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.category).toBe(CheckCategory.API_CONNECTIVITY);
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.CRITICAL);
    expect(result.message).toContain('API connectivity issues detected');
    expect(result.suggestions).toContain(
      'Check GROQ_API_KEY environment variable'
    );
  });

  it('should return warning when error rate is high but service is functional', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      status: 'healthy',
      message: 'Service is healthy',
    });

    (enhancedGroqClient.getUsageStats as jest.Mock).mockReturnValue({
      requestCount: 100,
      errorCount: 15,
      errorRate: 0.15, // 15% error rate is high
    });

    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      connected: true,
      responseTime: 800, // Slow but acceptable
      model: 'whisper-large-v3-turbo',
    });

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.category).toBe(CheckCategory.API_CONNECTIVITY);
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('High error rate detected');
    expect(result.suggestions).toContain(
      'Monitor API performance and consider rate limiting'
    );
  });

  it('should handle timeout errors gracefully', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockRejectedValue(
      new Error('Request timeout')
    );

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.category).toBe(CheckCategory.API_CONNECTIVITY);
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('TIMEOUT_ERROR');
    expect(result.suggestions).toContain(
      'Check network connection and API service status'
    );
  });

  it('should validate API response times are within acceptable limits', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      status: 'healthy',
      message: 'Service is healthy',
    });

    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      connected: true,
      responseTime: 5000, // Too slow
      model: 'whisper-large-v3-turbo',
    });

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('API response time is above optimal threshold');
    expect(result.metrics?.apiResponseTime).toBe(5000);
  });

  it('should provide detailed metrics for successful checks', async () => {
    // Arrange
    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      status: 'healthy',
      message: 'Groq service is healthy',
    });

    (enhancedGroqClient.getUsageStats as jest.Mock).mockReturnValue({
      requestCount: 250,
      errorCount: 5,
      lastUsed: new Date(),
      lastError: null,
    });

    (enhancedGroqClient.healthCheck as jest.Mock).mockResolvedValue({
      connected: true,
      responseTime: 180,
      model: 'whisper-large-v3-turbo',
      availableModels: ['whisper-large-v3-turbo', 'whisper-large-v3'],
    });

    // Act
    const result = await checkApiConnectivity();

    // Assert
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.apiResponseTime).toBe(180);
    expect(result.metrics?.apiSuccessRate).toBe(0.98); // (250-5)/250
    expect(result.metrics?.requestCount).toBe(250);
    expect(result.details).toBeDefined();
    expect(result.details?.groqStatus).toBe('healthy');
    expect(result.details?.availableModels).toContain('whisper-large-v3-turbo');
  });
});