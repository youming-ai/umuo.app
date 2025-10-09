import { checkSecurity } from './security';
import { HealthCheckResult, CheckCategory, CheckStatus, SeverityLevel } from '@/lib/health-check/types';
import { enhancedGroqClient } from '@/lib/enhanced-groq-client';

// Mock the enhanced Groq client
jest.mock('@/lib/enhanced-groq-client', () => ({
  enhancedGroqClient: {
    getStats: jest.fn(),
    validateApiKey: jest.fn(),
  },
}));

import { enhancedGroqClient as mockGroqClient } from '@/lib/enhanced-groq-client';

// Mock crypto and localStorage for security checks
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    length: 0,
    clear: jest.fn(),
    key: jest.fn(),
  },
  writable: true,
});

// Mock crypto.subtle for encryption checks
const mockSubtle = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  digest: jest.fn(),
  generateKey: jest.fn(),
  importKey: jest.fn(),
  exportKey: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(1)),
  },
  writable: true,
});

// Mock fetch for HTTPS checks
global.fetch = jest.fn();

describe('Security Compliance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage mocks
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    mockRemoveItem.mockClear();
  });

  it('should pass when all security checks are compliant', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
    });

    // Mock secure localStorage usage
    mockGetItem.mockImplementation((key) => {
      if (key === 'api_key') return null; // Should not store plain API keys
      if (key === 'encrypted_api_key') return 'encrypted_value_here';
      if (key.startsWith('health_check_')) return JSON.stringify({ test: 'data' });
      return null;
    });

    // Mock secure communication
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'strict-transport-security') return 'max-age=31536000; includeSubDomains';
          if (header === 'content-security-policy') return "default-src 'self'";
          if (header === 'x-frame-options') return 'DENY';
          if (header === 'x-content-type-options') return 'nosniff';
          return null;
        }),
      },
    });

    // Mock encryption capabilities
    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));
    mockSubtle.decrypt.mockResolvedValue(new ArrayBuffer(8));
    mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      category: CheckCategory.SECURITY,
      name: 'Security Compliance Check',
      status: CheckStatus.PASSED,
      severity: SeverityLevel.LOW,
      message: 'All security compliance checks passed',
      duration: expect.any(Number),
      timestamp: expect.any(Date),
    });

    expect(result.details).toMatchObject({
      apiKeySecurity: {
        encrypted: true,
        masked: true,
        notStoredInPlainText: true,
        permissionsValid: true,
      },
      dataProtection: {
        localStorageSecure: true,
        noSensitiveDataExposed: true,
        encryptionAvailable: true,
        dataRetentionCompliant: true,
      },
      communicationSecurity: {
        httpsEnabled: true,
        securityHeadersPresent: true,
        certificateValid: true,
      },
      accessControl: {
        permissionsProperlyConfigured: true,
        dataAccessControlled: true,
        auditTrailEnabled: true,
      },
    });

    expect(result.metrics).toMatchObject({
      securityScore: 100,
      apiKeyEncryptionStrength: 'strong',
      dataEncryptionEnabled: true,
      httpsCompliant: true,
      securityHeadersCount: expect.any(Number),
      accessControlLevel: 'proper',
    });
  });

  it('should detect plain text API key storage', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 50,
      successfulRequests: 48,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: false, // API key not encrypted
      masked: false,
      permissions: ['read', 'write'],
    });

    // Mock insecure API key storage
    mockGetItem.mockImplementation((key) => {
      if (key === 'api_key') return 'sk-1234567890abcdef'; // Plain text API key!
      if (key.startsWith('health_check_')) return JSON.stringify({ test: 'data' });
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.CRITICAL);
    expect(result.message).toContain('API key stored in plain text');
    expect(result.details.apiKeySecurity.encrypted).toBe(false);
    expect(result.details.apiKeySecurity.notStoredInPlainText).toBe(false);
    expect(result.details.securityViolations).toContain(
      expect.objectContaining({
        type: 'plain_text_api_key',
        severity: 'critical',
      })
    );
    expect(result.suggestions).toContain(
      expect.stringContaining('API key encryption')
    );
  });

  it('should detect missing security headers', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 30,
      successfulRequests: 29,
      failedRequests: 1,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
    });

    mockGetItem.mockReturnValue(null);

    // Mock missing security headers
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue(null), // No security headers
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('missing security headers');
    expect(result.details.communicationSecurity.securityHeadersPresent).toBe(false);
    expect(result.details.communicationSecurity.missingHeaders).toEqual(
      expect.arrayContaining([
        'strict-transport-security',
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
      ])
    );
    expect(result.suggestions).toContain(
      expect.stringContaining('security headers')
    );
  });

  it('should detect sensitive data in localStorage', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 40,
      successfulRequests: 38,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
    });

    // Mock sensitive data stored in localStorage
    mockGetItem.mockImplementation((key) => {
      if (key === 'user_email') return 'user@example.com';
      if (key === 'user_token') return 'Bearer token123';
      if (key === 'transcript_data') return JSON.stringify({
        text: 'Sensitive conversation content',
        speaker: 'User',
        timestamp: '2025-10-08T10:00:00Z',
      });
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('max-age=31536000'),
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('sensitive data stored insecurely');
    expect(result.details.dataProtection.noSensitiveDataExposed).toBe(false);
    expect(result.details.dataProtection.sensitiveDataFound).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'email',
          location: 'localStorage',
        }),
        expect.objectContaining({
          type: 'auth_token',
          location: 'localStorage',
        }),
        expect.objectContaining({
          type: 'transcript_content',
          location: 'localStorage',
        }),
      ])
    );
    expect(result.suggestions).toContain(
      expect.stringContaining('sensitive data')
    );
  });

  it('should detect insufficient encryption', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 25,
      successfulRequests: 24,
      failedRequests: 1,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
    });

    mockGetItem.mockReturnValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('max-age=31536000'),
      },
    });

    // Mock encryption failure
    mockSubtle.encrypt.mockRejectedValue(new Error('Encryption not supported'));
    mockSubtle.digest.mockRejectedValue(new Error('Hashing not supported'));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('encryption capabilities insufficient');
    expect(result.details.dataProtection.encryptionAvailable).toBe(false);
    expect(result.details.dataProtection.encryptionStrength).toBe('insufficient');
    expect(result.suggestions).toContain(
      expect.stringContaining('encryption')
    );
  });

  it('should detect improper access control', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 35,
      successfulRequests: 33,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: [], // No permissions defined
      role: 'undefined', // No role defined
    });

    mockGetItem.mockReturnValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('max-age=31536000'),
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('access control not properly configured');
    expect(result.details.accessControl.permissionsProperlyConfigured).toBe(false);
    expect(result.details.accessControl.dataAccessControlled).toBe(false);
    expect(result.suggestions).toContain(
      expect.stringContaining('access control')
    );
  });

  it('should handle security check errors gracefully', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockRejectedValue(new Error('Security check failed'));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.FAILED);
    expect(result.severity).toBe(SeverityLevel.HIGH);
    expect(result.message).toContain('Failed to validate security compliance');
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Security check failed');
  });

  it('should provide comprehensive security metrics', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 100,
      successfulRequests: 98,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
      role: 'user',
      lastRotated: new Date('2025-09-01'),
    });

    mockGetItem.mockImplementation((key) => {
      if (key.startsWith('health_check_')) return JSON.stringify({ test: 'data' });
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'strict-transport-security') return 'max-age=31536000; includeSubDomains';
          if (header === 'content-security-policy') return "default-src 'self'";
          if (header === 'x-frame-options') return 'DENY';
          if (header === 'x-content-type-options') return 'nosniff';
          if (header === 'permissions-policy') return 'camera=(), microphone=(), geolocation=()';
          return null;
        }),
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
    mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.metrics).toMatchObject({
      securityScore: 100,
      apiKeyEncryptionStrength: 'strong',
      dataEncryptionEnabled: true,
      httpsCompliant: true,
      securityHeadersCount: 5,
      accessControlLevel: 'proper',
      lastSecurityAudit: expect.any(Date),
      vulnerabilityScanPassed: true,
      dataRetentionDays: expect.any(Number),
    });

    expect(result.details.securityScoreBreakdown).toMatchObject({
      apiKeySecurity: 100,
      dataProtection: 100,
      communicationSecurity: 100,
      accessControl: 100,
    });
  });

  it('should detect data retention policy violations', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 60,
      successfulRequests: 58,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read', 'write'],
    });

    // Mock old data in localStorage (beyond retention period)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45); // 45 days old

    mockGetItem.mockImplementation((key) => {
      if (key.startsWith('health_check_report_')) {
        return JSON.stringify({
          timestamp: oldDate.toISOString(),
          data: 'old report data',
        });
      }
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('max-age=31536000'),
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.status).toBe(CheckStatus.WARNING);
    expect(result.severity).toBe(SeverityLevel.MEDIUM);
    expect(result.message).toContain('data retention policy violations');
    expect(result.details.dataProtection.dataRetentionCompliant).toBe(false);
    expect(result.details.dataProtection.expiredDataFound).toBeGreaterThan(0);
    expect(result.suggestions).toContain(
      expect.stringContaining('data retention')
    );
  });

  it('should complete security check within time limits', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 20,
      successfulRequests: 19,
      failedRequests: 1,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: true,
      masked: true,
      permissions: ['read'],
    });

    mockGetItem.mockReturnValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('max-age=31536000'),
      },
    });

    mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(8));

    const startTime = Date.now();

    // Act
    const result = await checkSecurity();
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    expect(result.duration).toBeLessThan(15000);
    expect(result.status).toBe(CheckStatus.PASSED);
  });

  it('should provide actionable security recommendations', async () => {
    // Arrange
    (mockGroqClient.getStats as jest.Mock).mockResolvedValue({
      totalRequests: 30,
      successfulRequests: 28,
      failedRequests: 2,
    });

    (mockGroqClient.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      encrypted: false, // Some issues
      masked: false,
      permissions: ['read'],
    });

    mockGetItem.mockImplementation((key) => {
      if (key === 'debug_logs') return 'sensitive error messages';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue(null), // Missing headers
      },
    });

    mockSubtle.encrypt.mockRejectedValue(new Error('No encryption'));

    // Act
    const result = await checkSecurity();

    // Assert
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'api_key_security',
          priority: 'critical',
          description: expect.stringContaining('API key encryption'),
          action: expect.stringContaining('encrypt API keys'),
        }),
        expect.objectContaining({
          category: 'security_headers',
          priority: 'high',
          description: expect.stringContaining('security headers'),
          action: expect.stringContaining('implement security headers'),
        }),
        expect.objectContaining({
          category: 'data_protection',
          priority: 'high',
          description: expect.stringContaining('sensitive data'),
          action: expect.stringContaining('remove sensitive data'),
        }),
        expect.objectContaining({
          category: 'encryption',
          priority: 'medium',
          description: expect.stringContaining('encryption'),
          action: expect.stringContaining('enable encryption'),
        }),
      ])
    );
  });
});