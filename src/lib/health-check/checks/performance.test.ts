import { checkPerformance } from './performance';
import { HealthCheckResult, CheckCategory, CheckStatus, SeverityLevel } from '@/lib/health-check/types';
import { enhancedGroqClient } from '@/lib/enhanced-groq-client';

// Mock the enhanced Groq client
jest.mock('@/lib/enhanced-groq-client', () => ({
  enhancedGroqClient: {
    transcribe: jest.fn(),
    getStats: jest.fn(),
  },
}));

import { enhancedGroqClient as mockGroqClient } from '@/lib/enhanced-groq-client';

// Mock performance.now for timing control
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass when all performance benchmarks are met', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0; // Start time
      if (callCount === 1) return 1500; // API call time: 1.5 seconds
      if (callCount === 2) return 1600; // End time
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 1200, // 1.2 seconds average
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test transcription result',
      duration: 2.5,
      processing_time: 1.5,
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      category: CheckCategory.PERFORMANCE,
      name: 'Performance Benchmarks',
      status: CheckStatus.PASSED,
      severity: SeverityLevel.LOW,
      message: 'All performance benchmarks are within acceptable limits',
      duration: expect.any(Number),
      timestamp: expect.any(Date),
    });

    expect(result.details).toMatchObject({
      apiResponseTime: 1500,
      memoryUsage: expect.any(Number),
      cpuUsage: expect.any(Number),
      benchmarks: {
        apiResponseTime: { target: 2000, actual: 1500, passed: true },
        processingSpeed: { target: 1.0, actual: 0.6, passed: true }, // 1.5s for 2.5s audio
        memoryUsage: { target: 512, actual: expect.any(Number), passed: true },
        cpuUsage: { target: 0.8, actual: expect.any(Number), passed: true },
      },
    });

    expect(result.metrics).toMatchObject({
      apiResponseTime: 1500,
      apiSuccessRate: 0.95,
      processingSpeed: expect.any(Number),
      memoryUsage: expect.any(Number),
      cpuUsage: expect.any(Number),
    });
  });

  it('should detect slow API response times', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 3000; // 3 seconds - too slow
      if (callCount === 2) return 3100;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 50,
      successfulRequests: 45,
      failedRequests: 5,
      averageResponseTime: 2800, // 2.8 seconds average
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 2.0,
      processing_time: 3.0,
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('API response time exceeds target');
    expect(result.details.benchmarks.apiResponseTime.passed).toBe(false);
    expect(result.details.benchmarks.apiResponseTime.actual).toBe(3000);
    expect(result.suggestions).toContain(
      expect.stringContaining('API response time')
    );
  });

  it('should detect high memory usage', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 1200;
      if (callCount === 2) return 1300;
      callCount++;
      return 100;
    });

    // Mock high memory usage
    const mockMemoryUsage = 600; // 600MB - exceeds 512MB target
    Object.defineProperty(process, 'memoryUsage', {
      value: jest.fn().mockReturnValue({
        heapUsed: mockMemoryUsage * 1024 * 1024,
        heapTotal: mockMemoryUsage * 1024 * 1024 * 1.5,
        external: 50 * 1024 * 1024,
        rss: mockMemoryUsage * 1024 * 1024 * 1.2,
      }),
    });

    const mockStats = {
      totalRequests: 30,
      successfulRequests: 28,
      failedRequests: 2,
      averageResponseTime: 1000,
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 2.0,
      processing_time: 1.2,
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('memory usage exceeds target');
    expect(result.details.benchmarks.memoryUsage.passed).toBe(false);
    expect(result.details.memoryUsage).toBeGreaterThan(512);
    expect(result.suggestions).toContain(
      expect.stringContaining('memory usage')
    );
  });

  it('should detect slow processing speed', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 2000;
      if (callCount === 2) return 2100;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 25,
      successfulRequests: 23,
      failedRequests: 2,
      averageResponseTime: 1800,
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 1.0, // 1 second audio
      processing_time: 2.0, // Takes 2 seconds to process - slower than real-time
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('processing speed is slower than real-time');
    expect(result.details.benchmarks.processingSpeed.passed).toBe(false);
    expect(result.details.benchmarks.processingSpeed.actual).toBeGreaterThan(1.0);
    expect(result.suggestions).toContain(
      expect.stringContaining('processing speed')
    );
  });

  it('should fail when performance is critically poor', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 8000; // 8 seconds - critically slow
      if (callCount === 2) return 8100;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 20,
      successfulRequests: 15,
      failedRequests: 5,
      averageResponseTime: 6000, // 6 seconds average
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 2.0,
      processing_time: 8.0,
    });

    // Mock very high memory usage
    Object.defineProperty(process, 'memoryUsage', {
      value: jest.fn().mockReturnValue({
        heapUsed: 1024 * 1024 * 1024, // 1GB
        heapTotal: 1.5 * 1024 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        rss: 1.2 * 1024 * 1024 * 1024,
      }),
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('critical performance issues');
    expect(result.details.failedBenchmarks).toBeGreaterThan(1);
    expect(result.error).toBeDefined();
    expect(result.suggestions).toContain(
      expect.stringContaining('critical performance issues')
    );
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockRejectedValue(new Error('API unavailable'));

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('Failed to validate performance benchmarks');
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('API unavailable');
  });

  it('should measure concurrent request performance', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 800; // First request
      if (callCount === 2) return 1200; // Second request
      if (callCount === 3) return 1600; // Third request
      if (callCount === 4) return 2000; // Fourth request
      if (callCount === 5) return 2400; // Fifth request
      if (callCount === 6) return 2500; // End time
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 100,
      successfulRequests: 98,
      failedRequests: 2,
      averageResponseTime: 900,
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 2.0,
      processing_time: 0.8,
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.status).toBe(CheckStatus.PASSED);
    expect(result.details.concurrentRequests).toBeDefined();
    expect(result.details.concurrentRequests.count).toBe(5);
    expect(result.details.concurrentRequests.averageTime).toBeLessThan(2000);
    expect(result.metrics.concurrentHandling).toBe(true);
  });

  it('should provide performance optimization suggestions', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 2500;
      if (callCount === 2) return 2600;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 40,
      successfulRequests: 35,
      failedRequests: 5,
      averageResponseTime: 2200,
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 3.0,
      processing_time: 2.5,
    });

    // Mock moderate memory usage
    Object.defineProperty(process, 'memoryUsage', {
      value: jest.fn().mockReturnValue({
        heapUsed: 400 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        external: 40 * 1024 * 1024,
        rss: 480 * 1024 * 1024,
      }),
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('API response time'),
        expect.stringContaining('processing speed'),
        expect.objectContaining({
          category: 'optimization',
          priority: 'medium',
          description: expect.stringContaining('optimize'),
        }),
      ])
    );
  });

  it('should complete performance check within time limits', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 1000;
      if (callCount === 2) return 1100;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 30,
      successfulRequests: 29,
      failedRequests: 1,
      averageResponseTime: 950,
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 1.0,
      processing_time: 1.0,
    });

    const startTime = Date.now();

    // Act
    const result = await checkPerformance();
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    expect(result.duration).toBeLessThan(15000);
    expect(result.status).toBe(CheckStatus.PASSED);
  });

  it('should track performance trends over time', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 1300;
      if (callCount === 2) return 1400;
      callCount++;
      return 100;
    });

    const mockStats = {
      totalRequests: 100,
      successfulRequests: 97,
      failedRequests: 3,
      averageResponseTime: 1300,
      trendData: [
        { timestamp: new Date(Date.now() - 3600000), responseTime: 1100 },
        { timestamp: new Date(Date.now() - 1800000), responseTime: 1200 },
        { timestamp: new Date(), responseTime: 1300 },
      ],
    };

    (mockGroqClient.getStats as jest.Mock).mockResolvedValue(mockStats);
    (mockGroqClient.transcribe as jest.Mock).mockResolvedValue({
      text: 'Test result',
      duration: 2.0,
      processing_time: 1.3,
    });

    // Act
    const result = await checkPerformance();

    // Assert
    expect(result.details.performanceTrend).toBeDefined();
    expect(result.details.performanceTrend.direction).toBe('increasing');
    expect(result.details.performanceTrend.rate).toBeGreaterThan(0);
    expect(result.metrics.trendAnalysis).toBe(true);
  });
});