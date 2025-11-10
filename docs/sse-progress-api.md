# Server-Sent Events (SSE) Progress API Documentation

## Overview

The SSE Progress API provides real-time updates for transcription job progress using Server-Sent Events technology. This endpoint enables efficient, low-latency communication between the client and server for real-time progress monitoring.

## Endpoint

```
GET /api/progress/[jobId]/stream
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `updateInterval` | number | 2000 | Update frequency in milliseconds (1000-30000) |
| `connectionType` | string | "sse" | Connection type: "sse", "polling", "periodic" |
| `deviceType` | string | "desktop" | Device type: "desktop", "mobile", "tablet" |
| `networkType` | string | "unknown" | Network type: "wifi", "cellular", "unknown" |
| `batteryLevel` | number | - | Battery level (0-1, optional) |
| `isLowPowerMode` | boolean | false | Whether device is in low power mode |

## Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, must-revalidate
Connection: keep-alive
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Cache-Control, Last-Event-ID
```

## Event Types

### 1. `connectionHealth` - Connection established

Sent when the SSE connection is successfully established.

```json
{
  "status": "connected",
  "jobId": "job-123",
  "deviceType": "mobile",
  "networkType": "wifi",
  "updateInterval": 5000,
  "timestamp": 1640995200000
}
```

### 2. `progress` - Progress update

Sent periodically with current progress information.

```json
{
  "jobId": "job-123",
  "fileId": 1,
  "status": "processing",
  "overallProgress": 45,
  "currentStage": "transcription",
  "message": "Processing chunk 3 of 10",
  "timestamp": 1640995200000,
  "stages": {
    "upload": {
      "progress": 100,
      "speed": 1024000,
      "eta": 0,
      "bytesTransferred": 1048576,
      "totalBytes": 1048576
    },
    "transcription": {
      "progress": 45,
      "currentChunk": 3,
      "totalChunks": 10,
      "eta": 120
    },
    "post-processing": {
      "progress": 0,
      "segmentsProcessed": 0,
      "totalSegments": 0
    }
  }
}
```

### 3. `stageChange` - Stage transition

Sent when the processing stage changes.

```json
{
  "jobId": "job-123",
  "currentStage": "post-processing",
  "previousStage": "transcription",
  "timestamp": 1640995200000
}
```

### 4. `error` - Error occurred

Sent when an error occurs during processing.

```json
{
  "code": "TRANSCRIPTION_ERROR",
  "message": "Failed to process audio chunk",
  "details": {
    "chunkIndex": 5,
    "error": "Audio format not supported",
    "retryCount": 2
  },
  "timestamp": 1640995200000
}
```

### 5. `complete` - Processing finished

Sent when the transcription is completed.

```json
{
  "jobId": "job-123",
  "completedAt": 1640995200000,
  "totalDuration": 120000
}
```

### 6. `ping` - Keep-alive

Sent every 30 seconds to keep the connection alive.

```json
{
  "timestamp": 1640995200000,
  "jobId": "job-123"
}
```

## Mobile Optimizations

The API automatically optimizes behavior based on device type and network conditions:

### Desktop (default)
- Update interval: 2 seconds
- Connection timeout: 5 minutes
- Retry attempts: 3

### Mobile
- Update interval: 5 seconds (reduced frequency)
- Connection timeout: 10 minutes (longer timeout)
- Retry attempts: 5 (more retries for unstable connections)

### Tablet
- Update interval: 3 seconds
- Connection timeout: 7.5 minutes
- Retry attempts: 4

### Low Power Mode
When `isLowPowerMode: true` is detected:
- Update interval is doubled
- Connection timeout is extended by 50%

## Error Handling

### HTTP Error Responses

#### 400 Bad Request - Invalid parameters
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": { ... }
  },
  "timestamp": "2023-12-31T23:59:59.999Z"
}
```

#### 404 Not Found - Job not found
```json
{
  "success": false,
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "No progress tracker found for the specified job ID",
    "details": { "jobId": "job-123" }
  },
  "timestamp": "2023-12-31T23:59:59.999Z"
}
```

#### 503 Service Unavailable - Database error
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to connect to the database",
    "details": { ... }
  },
  "timestamp": "2023-12-31T23:59:59.999Z"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error in progress streaming",
    "details": { ... }
  },
  "timestamp": "2023-12-31T23:59:59.999Z"
}
```

## Client Implementation Examples

### JavaScript (Browser)

```javascript
const eventSource = new EventSource(
  '/api/progress/job-123/stream?deviceType=mobile&updateInterval=3000'
);

eventSource.onopen = () => {
  console.log('SSE connection opened');
};

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.overallProgress + '%');
  updateProgressBar(data.overallProgress);
});

eventSource.addEventListener('stageChange', (event) => {
  const data = JSON.parse(event.data);
  console.log('Stage changed:', data.currentStage);
  updateStageDisplay(data.currentStage);
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  console.log('Transcription completed!');
  eventSource.close();
  redirectToResults();
});

eventSource.addEventListener('error', (event) => {
  console.error('SSE error:', event);
  eventSource.close();
  showErrorNotification();
});

eventSource.onerror = (error) => {
  console.error('Connection error:', error);
  eventSource.close();
};
```

### React Hook

```jsx
import { useEffect, useState } from 'react';

export function useProgressStream(jobId, options = {}) {
  const [progress, setProgress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const params = new URLSearchParams({
      deviceType: options.deviceType || 'desktop',
      updateInterval: options.updateInterval || 2000,
      ...options,
    });

    const eventSource = new EventSource(
      `/api/progress/${jobId}/stream?${params}`
    );

    eventSource.onopen = () => setIsConnected(true);
    
    eventSource.addEventListener('progress', (event) => {
      setProgress(JSON.parse(event.data));
    });

    eventSource.addEventListener('complete', () => {
      eventSource.close();
      setIsConnected(false);
    });

    eventSource.onerror = () => {
      setError(new Error('Connection error'));
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, JSON.stringify(options)]);

  return { progress, isConnected, error };
}
```

## Connection Management

### Reconnection Logic

Clients should implement automatic reconnection with exponential backoff:

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseDelay = 1000;

function connectWithRetry(jobId, options) {
  const eventSource = new EventSource(
    `/api/progress/${jobId}/stream?${new URLSearchParams(options)}`
  );

  eventSource.onerror = () => {
    eventSource.close();
    
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = baseDelay * Math.pow(2, reconnectAttempts);
      setTimeout(() => {
        reconnectAttempts++;
        connectWithRetry(jobId, options);
      }, delay);
    }
  };

  eventSource.addEventListener('connectionHealth', () => {
    reconnectAttempts = 0; // Reset on successful connection
  });

  return eventSource;
}
```

### Connection Health Monitoring

The server sends ping events every 30 seconds. Clients should monitor these to detect connection issues:

```javascript
let lastPingTime = Date.now();

eventSource.addEventListener('ping', (event) => {
  lastPingTime = Date.now();
});

// Check for connection issues
setInterval(() => {
  if (Date.now() - lastPingTime > 60000) { // No ping for 1 minute
    console.warn('Connection may be stale');
    eventSource.close();
    // Attempt reconnection
  }
}, 30000);
```

## Performance Considerations

1. **Update Frequency**: Use higher intervals for mobile devices to conserve battery
2. **Data Size**: Minimize the amount of data sent in each progress update
3. **Connection Limits**: Be mindful of browser limits on concurrent SSE connections
4. **Memory Usage**: Clean up event listeners and close connections when no longer needed

## Security

1. **CORS**: The endpoint allows connections from any origin with appropriate headers
2. **Authentication**: Job IDs should be validated to prevent unauthorized access
3. **Rate Limiting**: Consider implementing rate limiting for the endpoint
4. **Data Sanitization**: All data should be properly sanitized before transmission

## Testing

Use the provided test utilities in `src/lib/test/sse-test.ts` to test the SSE endpoint:

```javascript
import { testSSEPerformance, createSSETestURL } from '@/lib/test/sse-test';

const url = createSSETestURL('http://localhost:3000', {
  jobId: 'test-job-123',
  deviceType: 'mobile',
  updateInterval: 3000,
});

const metrics = await testSSEPerformance(url, 60000);
console.log('SSE Performance:', metrics);
```

## Browser Compatibility

Server-Sent Events are supported in all modern browsers:
- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge 79+
- Opera 11+

For older browsers, consider using a polyfill or falling back to long polling.