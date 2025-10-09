# Quickstart Guide: AI Transcription Functionality Check

**Feature**: AI转录功能检查
**Version**: 1.0.0
**Date**: 2025-10-08

---

## Overview

This guide helps you quickly set up and use the AI transcription functionality check feature. The health check tool monitors the status, performance, and reliability of AI transcription services to ensure optimal user experience.

## Prerequisites

- Modern web browser with JavaScript enabled
- Stable internet connection
- Valid API keys for AI services (Groq, Gemini, etc.)
- Audio files for testing (optional, default test audio provided)

## Quick Start

### 1. Access Health Check

1. Open the Oumu.ai application
2. Navigate to **Settings** → **Health Check** or access directly at `/health-check`
3. The health check dashboard will load showing current service statuses

### 2. Run Basic Health Check

```bash
# Using the UI
1. Click "Run Health Check" button
2. Wait for the check to complete (typically 1-2 minutes)
3. Review the results summary

# Using API (optional)
POST /api/health-check/run
{
  "categories": ["api-connectivity", "authentication"],
  "services": ["Groq"],
  "parallel": true
}
```

### 3. Interpret Results

**Health Status Indicators:**
- 🟢 **Healthy** (80-100): All services working properly
- 🟡 **Degraded** (60-79): Some issues detected, but functional
- 🔴 **Unhealthy** (0-59): Critical issues requiring attention

**Key Metrics:**
- **Response Time**: <2 seconds is good
- **Success Rate**: >95% is excellent
- **Accuracy**: >90% for transcription quality
- **Availability**: >99% for service uptime

### 4. Troubleshoot Issues

**Common Issues and Solutions:**

#### API Connection Failed
```
Problem: Network connectivity or API key issues
Solution:
1. Check internet connection
2. Verify API key validity
3. Check service status at provider's website
```

#### Transcription Quality Low
```
Problem: Audio quality or service performance issues
Solution:
1. Test with different audio files
2. Check audio format compatibility
3. Try alternative AI services
```

#### Quota Exceeded
```
Problem: API usage limits reached
Solution:
1. Check current usage in dashboard
2. Upgrade service plan if needed
3. Wait for quota reset (usually monthly)
```

## Detailed Usage

### Health Check Categories

1. **API Connectivity**: Tests network connectivity and API responsiveness
2. **Authentication**: Validates API keys and permissions
3. **Transcription Test**: Performs actual transcription with test audio
4. **Quota Status**: Checks current usage against limits
5. **Quality Metrics**: Evaluates transcription accuracy and performance
6. **UI Performance**: Measures interface responsiveness and loading times

### Custom Configuration

```typescript
// Example configuration
const config = {
  timeout: 30000,           // 30 seconds timeout
  retryAttempts: 3,         // Retry failed requests 3 times
  parallelChecks: true,     // Run checks concurrently
  verboseLogging: false,    // Reduce log output
  testAudioSize: 1048576,   // 1MB test audio file
  enabledCategories: [
    'api-connectivity',
    'transcription-test',
    'authentication'
  ],
  enabledServices: [
    'Groq',
    'Gemini'
  ]
};
```

### API Integration

#### Start Health Check
```javascript
const response = await fetch('/api/health-check/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    categories: ['api-connectivity', 'transcription-test'],
    services: ['Groq'],
    parallel: true
  })
});
const { checkId } = await response.json();
```

#### Check Status
```javascript
const status = await fetch(`/api/health-check/status/${checkId}`);
const { status: checkStatus, progress } = await status.json();
```

#### Get Results
```javascript
const results = await fetch(`/api/health-check/results/${checkId}`);
const { summary, results: checkResults } = await results.json();
```

### Test Audio Files

**Supported Formats:**
- MP3, WAV, M4A, OGG, WebM
- Maximum file size: 50MB
- Maximum duration: 30 minutes
- Sample rate: 16kHz or higher recommended

**Test Audio Requirements:**
- Clear speech (single speaker preferred)
- Minimal background noise
- Standard language (English, Chinese, etc.)
- Moderate speaking pace

## Monitoring and Alerts

### Dashboard Features

1. **Real-time Status**: Live monitoring of all AI services
2. **Historical Trends**: Performance graphs over time
3. **Alert Configuration**: Custom notification thresholds
4. **Report Export**: Download detailed reports (PDF, CSV)

### Alert Thresholds

```javascript
const alertThresholds = {
  responseTime: 2000,      // Alert if >2 seconds
  successRate: 95,         // Alert if <95%
  accuracy: 90,           // Alert if <90%
  availability: 99,       // Alert if <99%
  memoryUsage: 100        // Alert if >100MB
};
```

## Best Practices

### Regular Maintenance

1. **Daily**: Quick connectivity check
2. **Weekly**: Full transcription test
3. **Monthly**: Review performance trends and quota usage
4. **Quarterly**: Update API keys and review service configurations

### Performance Optimization

1. **Use Parallel Checks**: Enable concurrent testing for faster results
2. **Cache Results**: Store recent check results to reduce API calls
3. **Optimize Audio**: Use compressed test files to reduce upload time
4. **Schedule Off-peak**: Run comprehensive checks during low usage periods

### Security Considerations

1. **Protect API Keys**: Store keys securely, never expose in client-side code
2. **Limit Access**: Restrict health check access to authorized users
3. **Audit Logs**: Monitor who runs checks and when
4. **Data Privacy**: Don't store user audio files longer than necessary

## Troubleshooting Guide

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| HC001 | Network timeout | Check connection, increase timeout |
| HC002 | Authentication failed | Verify API keys |
| HC003 | Service unavailable | Try alternative service |
| HC004 | Quota exceeded | Check usage, upgrade plan |
| HC005 | Audio format error | Convert to supported format |
| HC006 | Processing timeout | Reduce audio size, try again |

### Performance Issues

**Slow Response Times:**
1. Check network connectivity
2. Reduce test audio size
3. Disable parallel checks if system resources limited
4. Try different AI service provider

**Inaccurate Results:**
1. Verify audio quality
2. Check language settings
3. Update to latest service models
4. Calibrate accuracy thresholds

### Getting Help

1. **Check Documentation**: Review full API documentation
2. **View Logs**: Enable verbose logging for detailed error info
3. **Contact Support**: Reach out with error codes and system information
4. **Community Forum**: Share issues and solutions with other users

## Advanced Features

### Automated Testing

```javascript
// Automated daily health check
const scheduleHealthCheck = async () => {
  const config = {
    categories: ['api-connectivity', 'authentication'],
    services: ['Groq', 'Gemini'],
    parallel: true
  };

  const response = await fetch('/api/health-check/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });

  return response.json();
};
```

### Custom Metrics

```javascript
// Add custom performance metrics
const customMetrics = {
  customResponseTime: 1500,
  customAccuracy: 95,
  customThreshold: 80
};
```

### Integration with Monitoring Tools

```javascript
// Export to external monitoring systems
const exportMetrics = async (checkResults) => {
  await fetch('/api/monitoring/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'health-check',
      metrics: checkResults.metrics,
      timestamp: new Date().toISOString()
    })
  });
};
```

## FAQ

**Q: How often should I run health checks?**
A: Quick connectivity checks daily, full transcription tests weekly.

**Q: Can I run health checks automatically?**
A: Yes, use the API to schedule automated checks at preferred intervals.

**Q: What happens if a service is down?**
A: The system will automatically fail over to alternative services if available.

**Q: How long do health check results persist?**
A: Results are stored for 30 days by default, configurable in settings.

**Q: Can I test with my own audio files?**
A: Yes, you can upload custom audio files for transcription testing.

---

## Next Steps

1. **Run First Health Check**: Test your current setup
2. **Configure Alerts**: Set up notifications for critical issues
3. **Schedule Regular Checks**: Automate monitoring routine
4. **Review Documentation**: Explore advanced features and APIs

For additional support, see the [full documentation](../docs/) or contact the development team.