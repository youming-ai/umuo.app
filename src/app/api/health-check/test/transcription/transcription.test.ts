import { createMocks } from 'node-mocks-http';
import { POST } from './route';

// Mock the transcription test module
jest.mock('@/lib/health-check/checks/transcription-test', () => ({
  testTranscription: jest.fn(),
}));

describe('/api/health-check/test/transcription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test transcription with JSON payload', async () => {
    const mockResult = {
      testId: 'test-123',
      serviceName: 'Groq',
      status: 'success',
      transcription: 'Hello world',
      confidence: 95.5,
      language: 'en',
      processingTime: 1500,
      metrics: {
        responseTime: 1200,
        uploadTime: 200,
        processingTime: 100,
        downloadTime: 100,
        totalTime: 1400,
        accuracy: 95.5,
      },
    };

    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockResolvedValue(mockResult);

    const request = {
      json: jest.fn().mockResolvedValue({
        serviceName: 'Groq',
      }),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as any;

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.testId).toBe('test-123');
    expect(data.serviceName).toBe('Groq');
    expect(data.status).toBe('success');
    expect(data.transcription).toBe('Hello world');
    expect(data.confidence).toBe(95.5);
    expect(data.language).toBe('en');
    expect(data.processingTime).toBe(1500);
    expect(data.timestamp).toBeDefined();
    expect(testTranscription).toHaveBeenCalledWith({
      serviceName: 'Groq',
      timeout: 30000,
    });
  });

  it('should handle form data with audio file', async () => {
    const mockFile = new File(['test audio content'], 'test.mp3', {
      type: 'audio/mpeg',
    });

    const mockResult = {
      testId: 'test-456',
      serviceName: 'Groq',
      status: 'success',
      transcription: 'Test transcription result',
      confidence: 88.0,
      language: 'en',
      processingTime: 2000,
      metrics: {
        responseTime: 1800,
        uploadTime: 150,
        processingTime: 1500,
        downloadTime: 50,
        totalTime: 2000,
        accuracy: 88.0,
      },
    };

    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockResolvedValue(mockResult);

    const formData = new FormData();
    formData.append('audioFile', mockFile);
    formData.append('serviceName', 'Groq');

    const request = {
      formData: jest.fn().mockResolvedValue(formData),
      headers: {
        get: jest.fn().mockReturnValue('multipart/form-data; boundary=----WebKitFormBoundary'),
      },
    } as any;

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.testId).toBe('test-456');
    expect(data.serviceName).toBe('Groq');
    expect(data.status).toBe('success');
    expect(testTranscription).toHaveBeenCalledWith({
      audioFile: mockFile,
      serviceName: 'Groq',
      timeout: 30000,
    });
  });

  it('should handle transcription errors gracefully', async () => {
    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockRejectedValue(new Error('API error'));

    const request = {
      json: jest.fn().mockResolvedValue({
        serviceName: 'Groq',
      }),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as any;

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();

    expect(data.error).toBe('Failed to test transcription');
    expect(data.message).toBe('API error');
    expect(data.timestamp).toBeDefined();
  });

  it('should validate response structure', async () => {
    const mockResult = {
      testId: 'test-789',
      serviceName: 'Groq',
      status: 'success',
      transcription: 'Sample transcription',
      confidence: 92.3,
      language: 'en',
      processingTime: 1800,
      metrics: {
        responseTime: 1500,
        uploadTime: 200,
        processingTime: 1300,
        downloadTime: 100,
        totalTime: 1600,
        accuracy: 92.3,
      },
    };

    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockResolvedValue(mockResult);

    const request = {
      json: jest.fn().mockResolvedValue({
        serviceName: 'Groq',
      }),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as any;

    const response = await POST(request);
    const data = await response.json();

    // Validate required fields
    expect(data).toHaveProperty('testId');
    expect(data).toHaveProperty('serviceName');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('transcription');
    expect(data).toHaveProperty('confidence');
    expect(data).toHaveProperty('language');
    expect(data).toHaveProperty('processingTime');
    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('timestamp');

    // Validate metrics structure
    expect(data.metrics).toHaveProperty('responseTime');
    expect(data.metrics).toHaveProperty('uploadTime');
    expect(data.metrics).toHaveProperty('processingTime');
    expect(data.metrics).toHaveProperty('downloadTime');
    expect(data.metrics).toHaveProperty('totalTime');
    expect(data.metrics).toHaveProperty('accuracy');
  });

  it('should handle missing service name gracefully', async () => {
    const mockResult = {
      testId: 'test-default',
      serviceName: 'Groq',
      status: 'success',
      transcription: 'Default test',
      confidence: 90.0,
      language: 'en',
      processingTime: 1200,
      metrics: {
        responseTime: 1000,
        uploadTime: 0,
        processingTime: 1000,
        downloadTime: 200,
        totalTime: 1200,
        accuracy: 90.0,
      },
    };

    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockResolvedValue(mockResult);

    const request = {
      json: jest.fn().mockResolvedValue({}),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.serviceName).toBe('Groq'); // Default service
  });

  it('should validate confidence score range', async () => {
    const mockResult = {
      testId: 'test-789',
      serviceName: 'Groq',
      status: 'success',
      transcription: 'Sample transcription',
      confidence: 95.0,
      language: 'en',
      processingTime: 1800,
      metrics: {
        responseTime: 1500,
        uploadTime: 200,
        processingTime: 1300,
        downloadTime: 100,
        totalTime: 1600,
        accuracy: 95.0,
      },
    };

    const { testTranscription } = require('@/lib/health-check/checks/transcription-test');
    (testTranscription as jest.Mock).mockResolvedValue(mockResult);

    const request = {
      json: jest.fn().mockResolvedValue({
        serviceName: 'Groq',
      }),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(data.confidence).toBeGreaterThanOrEqual(0);
    expect(data.confidence).toBeLessThanOrEqual(100);
  });
});