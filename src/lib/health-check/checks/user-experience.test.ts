import { checkUserExperience } from './user-experience';
import { HealthCheckResult, CheckCategory, CheckStatus, SeverityLevel } from '@/lib/health-check/types';

// Mock DOM methods for UI responsiveness testing
const mockGetBoundingClientRect = jest.fn();
const mockQuerySelector = jest.fn();
const mockComputedStyle = jest.fn();

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
});

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: mockGetBoundingClientRect,
});

Object.defineProperty(window, 'getComputedStyle', {
  value: mockComputedStyle,
});

// Mock IntersectionObserver for visibility testing
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance timing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    getEntriesByType: jest.fn(),
  },
  writable: true,
});

describe('User Experience Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window dimensions
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('should pass when all UX checks are successful', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 50; // UI response: 50ms
      if (callCount === 2) return 1200; // Page load: 1.2s
      callCount++;
      return 100;
    });

    // Mock successful DOM queries
    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
        top: 100,
        left: 50,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      color: '#000000',
      fontSize: '16px',
      lineHeight: '1.5',
    });

    // Mock performance entries
    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      {
        name: 'first-contentful-paint',
        startTime: 800,
      },
      {
        name: 'largest-contentful-paint',
        startTime: 1500,
      },
      {
        name: 'first-input-delay',
        startTime: 50,
      },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      category: CheckCategory.USER_EXPERIENCE,
      name: 'User Experience Validation',
      status: CheckStatus.PASSED,
      severity: SeverityLevel.LOW,
      message: 'All user experience checks passed',
      duration: expect.any(Number),
      timestamp: expect.any(Date),
    });

    expect(result.details).toMatchObject({
      uiResponsiveness: { score: 100, responseTime: 50 },
      pageLoadTime: { score: 100, loadTime: 1200 },
      accessibility: { score: 100, issues: 0 },
      mobileCompatibility: { score: 100, responsive: true },
      errorHandling: { score: 100, userFriendly: true },
    });

    expect(result.metrics).toMatchObject({
      uiResponseTime: 50,
      pageLoadTime: 1200,
      firstContentfulPaint: 800,
      largestContentfulPaint: 1500,
      firstInputDelay: 50,
      accessibilityScore: 100,
      mobileResponsive: true,
    });
  });

  it('should detect slow UI response times', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 200; // 200ms response - too slow
      if (callCount === 2) return 1200;
      callCount++;
      return 100;
    });

    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 800 },
      { name: 'largest-contentful-paint', startTime: 1500 },
      { name: 'first-input-delay', startTime: 50 },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('UI response time exceeds target');
    expect(result.details.uiResponsiveness.score).toBeLessThan(100);
    expect(result.details.uiResponsiveness.responseTime).toBe(200);
    expect(result.suggestions).toContain(
      expect.stringContaining('UI response time')
    );
  });

  it('should detect slow page load times', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 50;
      if (callCount === 2) return 4000; // 4 seconds load time - too slow
      callCount++;
      return 100;
    });

    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 2500 }, // Slow FCP
      { name: 'largest-contentful-paint', startTime: 4000 }, // Slow LCP
      { name: 'first-input-delay', startTime: 100 },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('page load time exceeds target');
    expect(result.details.pageLoadTime.score).toBeLessThan(100);
    expect(result.details.pageLoadTime.loadTime).toBe(4000);
    expect(result.suggestions).toContain(
      expect.stringContaining('page load time')
    );
  });

  it('should detect accessibility issues', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 50;
      if (callCount === 2) return 1200;
      callCount++;
      return 100;
    });

    // Mock element with accessibility issues
    mockQuerySelector.mockImplementation((selector) => {
      if (selector.includes('img')) {
        return {
          getAttribute: jest.fn().mockReturnValue(null), // Missing alt text
          tagName: 'IMG',
        };
      }
      if (selector.includes('button')) {
        return {
          innerText: '',
          getAttribute: jest.fn().mockReturnValue(null), // Missing aria-label
          tagName: 'BUTTON',
        };
      }
      if (selector.includes('h1')) {
        return null; // Missing h1
      }
      return {
        getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
          width: 300,
          height: 200,
        }),
        offsetWidth: 300,
        offsetHeight: 200,
        style: {},
        classList: { contains: jest.fn().mockReturnValue(false) },
      };
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      color: '#000000',
      fontSize: '16px',
      lineHeight: '1.5',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 800 },
      { name: 'largest-contentful-paint', startTime: 1500 },
      { name: 'first-input-delay', startTime: 50 },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('accessibility issues found');
    expect(result.details.accessibility.score).toBeLessThan(100);
    expect(result.details.accessibility.issues).toBeGreaterThan(0);
    expect(result.details.accessibility.issuesList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'missing-alt-text',
          severity: 'medium',
        }),
        expect.objectContaining({
          type: 'missing-aria-label',
          severity: 'medium',
        }),
      ])
    );
    expect(result.suggestions).toContain(
      expect.stringContaining('accessibility')
    );
  });

  it('should detect mobile compatibility issues', async () => {
    // Arrange
    // Set mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;

    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 50;
      if (callCount === 2) return 1200;
      callCount++;
      return 100;
    });

    // Mock element that doesn't adapt to mobile
    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 1200, // Too wide for mobile
        height: 200,
      }),
      offsetWidth: 1200,
      offsetHeight: 200,
      style: { width: '1200px' }, // Fixed width
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      fontSize: '12px', // Too small for mobile
      touchAction: 'auto', // No touch optimization
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 800 },
      { name: 'largest-contentful-paint', startTime: 1500 },
      { name: 'first-input-delay', startTime: 50 },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('mobile compatibility issues');
    expect(result.details.mobileCompatibility.score).toBeLessThan(100);
    expect(result.details.mobileCompatibility.responsive).toBe(false);
    expect(result.details.mobileCompatibility.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'fixed-width-layout',
          severity: 'high',
        }),
        expect.objectContaining({
          type: 'small-font-size',
          severity: 'medium',
        }),
      ])
    );
    expect(result.suggestions).toContain(
      expect.stringContaining('mobile compatibility')
    );
  });

  it('should detect poor error handling UX', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 50;
      if (callCount === 2) return 1200;
      callCount++;
      return 100;
    });

    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 800 },
      { name: 'largest-contentful-paint', startTime: 1500 },
      { name: 'first-input-delay', startTime: 50 },
    ]);

    // Mock error scenarios to test error handling UX
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Simulate error handling check
    try {
      throw new Error('Test error for UX validation');
    } catch (error) {
      // Mock poor error handling (no user-friendly message)
      console.error('Raw error:', error);
    }

    // Act
    const result = await checkUserExperience();

    // Restore console.error
    console.error = originalConsoleError;

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('error handling could be improved');
    expect(result.details.errorHandling.score).toBeLessThan(100);
    expect(result.details.errorHandling.userFriendly).toBe(false);
    expect(result.suggestions).toContain(
      expect.stringContaining('error handling')
    );
  });

  it('should fail when UX is critically poor', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 500; // Very slow UI response
      if (callCount === 2) return 8000; // Very slow page load
      callCount++;
      return 100;
    });

    // Mock missing essential elements
    mockQuerySelector.mockReturnValue(null);

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 4000 }, // Very slow
      { name: 'largest-contentful-paint', startTime: 8000 }, // Very slow
      { name: 'first-input-delay', startTime: 300 }, // High delay
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('critical user experience issues');
    expect(result.details.failedChecks).toBeGreaterThan(2);
    expect(result.error).toBeDefined();
    expect(result.suggestions).toContain(
      expect.stringContaining('critical UX issues')
    );
  });

  it('should handle DOM errors gracefully', async () => {
    // Arrange
    mockQuerySelector.mockImplementation(() => {
      throw new Error('DOM access denied');
    });

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('Failed to validate user experience');
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('DOM access denied');
  });

  it('should provide comprehensive UX metrics', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 80;
      if (callCount === 2) return 1800;
      callCount++;
      return 100;
    });

    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      color: '#000000',
      fontSize: '16px',
      lineHeight: '1.5',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 900 },
      { name: 'largest-contentful-paint', startTime: 1600 },
      { name: 'first-input-delay', startTime: 80 },
      { name: 'cumulative-layout-shift', startTime: 0, value: 0.1 },
    ]);

    // Act
    const result = await checkUserExperience();

    // Assert
    expect(result.metrics).toMatchObject({
      uiResponseTime: 80,
      pageLoadTime: 1800,
      firstContentfulPaint: 900,
      largestContentfulPaint: 1600,
      firstInputDelay: 80,
      cumulativeLayoutShift: 0.1,
      accessibilityScore: 100,
      mobileResponsive: true,
      userInteractionScore: expect.any(Number),
      visualStabilityScore: expect.any(Number),
    });

    expect(result.details.overallUXScore).toBeGreaterThan(80);
  });

  it('should complete UX validation within time limits', async () => {
    // Arrange
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      if (callCount === 0) return 0;
      if (callCount === 1) return 60;
      if (callCount === 2) return 1300;
      callCount++;
      return 100;
    });

    mockQuerySelector.mockReturnValue({
      getBoundingClientRect: mockGetBoundingClientRect.mockReturnValue({
        width: 300,
        height: 200,
      }),
      offsetWidth: 300,
      offsetHeight: 200,
      style: {},
      classList: { contains: jest.fn().mockReturnValue(false) },
    });

    mockComputedStyle.mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    });

    (performance.getEntriesByType as jest.Mock).mockReturnValue([
      { name: 'first-contentful-paint', startTime: 800 },
      { name: 'largest-contentful-paint', startTime: 1300 },
      { name: 'first-input-delay', startTime: 60 },
    ]);

    const startTime = Date.now();

    // Act
    const result = await checkUserExperience();
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    expect(result.duration).toBeLessThan(10000);
    expect(result.status).toBe(CheckStatus.PASSED);
  });
});