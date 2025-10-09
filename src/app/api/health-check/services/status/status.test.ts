import { createMocks } from 'node-mocks-http';
import { GET } from './route';

// Mock the health check module
jest.mock('@/lib/health-check/checks/api-connectivity', () => ({
  getServiceStatuses: jest.fn(),
}));

describe('/api/health-check/services/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return service statuses', async () => {
    const mockStatuses = [
      {
        serviceName: 'Groq',
        isOnline: true,
        lastCheck: new Date('2023-10-08T10:00:00Z'),
        responseTime: 150,
        availability: 99.5,
        quotaInfo: {
          current: 500,
          limit: 1000,
          percentage: 50,
        },
        capabilities: ['transcription', 'text-processing'],
      },
    ];

    const { getServiceStatuses } = require('@/lib/health-check/checks/api-connectivity');
    (getServiceStatuses as jest.Mock).mockResolvedValue(mockStatuses);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.services).toEqual(mockStatuses);
    expect(data.lastUpdated).toBeDefined();
    expect(getServiceStatuses).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const { getServiceStatuses } = require('@/lib/health-check/checks/api-connectivity');
    (getServiceStatuses as jest.Mock).mockRejectedValue(new Error('Network error'));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
    const data = await response.json();

    expect(data.error).toBe('Failed to fetch service statuses');
    expect(data.message).toBe('Network error');
    expect(data.timestamp).toBeDefined();
  });

  it('should validate response structure', async () => {
    const mockStatuses = [
      {
        serviceName: 'Groq',
        isOnline: true,
        lastCheck: new Date('2023-10-08T10:00:00Z'),
        responseTime: 120,
        availability: 98.0,
        quotaInfo: {
          current: 300,
          limit: 1000,
          percentage: 30,
        },
        capabilities: ['transcription'],
      },
    ];

    const { getServiceStatuses } = require('@/lib/health-check/checks/api-connectivity');
    (getServiceStatuses as jest.Mock).mockResolvedValue(mockStatuses);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    // Validate required fields
    expect(data).toHaveProperty('services');
    expect(data).toHaveProperty('lastUpdated');
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services[0]).toHaveProperty('serviceName');
    expect(data.services[0]).toHaveProperty('isOnline');
    expect(data.services[0]).toHaveProperty('lastCheck');
    expect(data.services[0]).toHaveProperty('responseTime');
    expect(data.services[0]).toHaveProperty('availability');
    expect(data.services[0]).toHaveProperty('quotaInfo');
    expect(data.services[0]).toHaveProperty('capabilities');
  });
});