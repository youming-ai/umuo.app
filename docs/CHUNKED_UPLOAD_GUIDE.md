# Chunked File Upload System Guide

This guide provides comprehensive documentation for implementing and using the chunked file upload system with automatic resume capability in the umuo.app application.

## Overview

The chunked upload system is a robust solution for handling large file uploads with features including:

- **Chunked Processing**: Large files are split into manageable chunks for efficient upload
- **Automatic Resume**: Interrupted uploads can be resumed from the last successful chunk
- **Network Optimization**: Adaptive chunk sizing based on network conditions
- **Progress Tracking**: Real-time progress monitoring with detailed metrics
- **Error Recovery**: Comprehensive error handling with intelligent retry mechanisms
- **Mobile Optimization**: Specialized features for mobile device constraints

## Quick Start

### Basic Usage

```typescript
import { useChunkedUpload } from '@/lib/upload';

function MyUploadComponent() {
  const { uploadFile, isUploading, error } = useChunkedUpload({
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
    },
    onComplete: (sessionId, response) => {
      console.log('Upload completed:', response);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
  });

  const handleFileSelect = async (file: File) => {
    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        disabled={isUploading}
      />
      {isUploading && <div>Uploading...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Mobile-Optimized Upload

```typescript
import { useMobileChunkedUpload } from '@/lib/upload/mobile-integration';

function MobileUploadComponent() {
  const { uploadFiles, isUploading, error } = useMobileChunkedUpload({
    enableResume: true,
    adaptiveUpload: true,
    onSuccess: (files) => {
      console.log('Files uploaded successfully:', files);
    },
    onProgress: (progress) => {
      console.log(`Progress: ${progress.percentage}% (${progress.formattedLoaded}/${progress.formattedTotal})`);
    },
  });

  const handleFiles = async (files: File[]) => {
    try {
      await uploadFiles(files);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
}
```

## Architecture

### Core Components

1. **ChunkedUploader**: Main orchestrator for the upload process
2. **ChunkManager**: Handles file chunking and memory management
3. **ResumeManager**: Manages upload state persistence and recovery
4. **NetworkOptimizer**: Optimizes upload settings based on network conditions
5. **PerformanceMonitor**: Tracks upload performance and metrics
6. **UploadErrorHandler**: Comprehensive error handling and recovery

### Data Flow

```
File Selection → Chunk Creation → Upload Session → Chunk Uploads → File Assembly → Completion
      ↓              ↓              ↓              ↓              ↓              ↓
  Validation     Memory Mgmt    State Track    Network Opt    Integrity     Processing
                                          Progress Track                 Database
                                          Error Recovery
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrentUploads: 3,
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoffMultiplier: 2,
  networkTimeout: 30000,
  enableResume: true,
  enableAdaptiveChunking: true,
  minChunkSize: 256 * 1024, // 256KB
  maxChunkSize: 10 * 1024 * 1024, // 10MB
  verifyChunks: true,
  compressionEnabled: false,
  endpointUrl: "/api/upload/chunk",
};
```

### Mobile-Specific Configuration

```typescript
const MOBILE_CONFIG = {
  ...DEFAULT_CONFIG,
  chunkSize: 512 * 1024, // 512KB for mobile
  maxConcurrentUploads: 2,
  maxChunkSize: 5 * 1024 * 1024, // 5MB for mobile
  networkTimeout: 45000, // 45 seconds
};
```

### Adaptive Configuration

```typescript
import { getOptimalUploadConfig } from '@/lib/upload';

// Get network-optimized configuration
const config = getOptimalUploadConfig();

// Custom configuration with validation
import { UploadConfigValidator } from '@/lib/upload';

const validator = UploadConfigValidator.getInstance();
const result = validator.validateUploadConfig({
  chunkSize: 2 * 1024 * 1024, // 2MB
  enableAdaptiveChunking: true,
});

if (result.isValid) {
  // Use validated configuration
}
```

## Advanced Usage

### Session Management

```typescript
import { useUploadSession } from '@/lib/upload';

function UploadProgress({ sessionId }) {
  const {
    session,
    progress,
    isActive,
    isPaused,
    isCompleted,
    pauseUpload,
    resumeUpload,
    cancelUpload,
  } = useUploadSession(sessionId);

  return (
    <div>
      <h3>Upload Progress</h3>
      <div>Progress: {progress?.percentage}%</div>
      <div>Speed: {progress?.formattedSpeed}</div>
      <div>Time Remaining: {progress?.formattedTimeRemaining}</div>
      
      {isActive && (
        <button onClick={pauseUpload}>Pause</button>
      )}
      
      {isPaused && (
        <button onClick={resumeUpload}>Resume</button>
      )}
      
      <button onClick={cancelUpload}>Cancel</button>
    </div>
  );
}
```

### Multiple Upload Management

```typescript
import { useUploadSessions } from '@/lib/upload';

function UploadManager() {
  const {
    sessions,
    uploadingSessions,
    pausedSessions,
    activeCount,
    pauseAll,
    cancelAll,
  } = useUploadSessions();

  return (
    <div>
      <h3>Upload Manager</h3>
      <div>Active Uploads: {activeCount}</div>
      
      <div>
        <button onClick={pauseAll}>Pause All</button>
        <button onClick={cancelAll}>Cancel All</button>
      </div>
      
      {sessions.map(session => (
        <div key={session.id}>
          <div>{session.fileName}</div>
          <div>{Math.round((session.uploadedSize / session.fileSize) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}
```

### Performance Monitoring

```typescript
import { useUploadPerformance } from '@/lib/upload';

function UploadMetrics({ sessionId }) {
  const { metrics, diagnostic } = useUploadPerformance(sessionId);

  return (
    <div>
      <h3>Upload Metrics</h3>
      {metrics && (
        <div>
          <div>Average Speed: {Math.round(metrics.uploadSpeed / 1024)} KB/s</div>
          <div>Efficiency: {Math.round(metrics.efficiency * 100)}%</div>
          <div>Retry Count: {metrics.retryCount}</div>
        </div>
      )}
      
      {diagnostic && (
        <div>
          <h4>Diagnostic Information</h4>
          {diagnostic.criticalIssues.map(issue => (
            <div key={issue}>⚠️ {issue}</div>
          ))}
          {diagnostic.recommendations.map(rec => (
            <div key={rec}>💡 {rec}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Server Integration

### Backend Requirements

The chunked upload system requires server-side support for:

1. **Chunk Upload Endpoint**: `/api/upload/chunk`
2. **Upload Completion Endpoint**: `/api/upload/complete`
3. **Session Management**: Track upload sessions and chunk progress
4. **File Assembly**: Combine chunks into complete files
5. **Error Handling**: Respond appropriately to upload errors

### API Endpoints

#### POST /api/upload/chunk

Handles individual chunk uploads.

**Request:**
```typescript
const formData = new FormData();
formData.append('sessionId', sessionId);
formData.append('fileId', fileId);
formData.append('chunkId', chunkId);
formData.append('chunkIndex', chunkIndex.toString());
formData.append('chunkStart', start.toString());
formData.append('chunkEnd', end.toString());
formData.append('totalChunks', totalChunks.toString());
formData.append('fileName', fileName);
formData.append('fileSize', fileSize.toString());
formData.append('fileType', fileType);
formData.append('chunk', chunkBlob);
```

**Response:**
```json
{
  "success": true,
  "chunkId": "chunk_123",
  "uploadId": "session_456",
  "complete": false,
  "progress": {
    "uploaded": 5,
    "total": 10,
    "percentage": 50
  }
}
```

#### POST /api/upload/complete

Finalizes the upload and assembles the complete file.

**Request:**
```json
{
  "sessionId": "session_456",
  "fileId": "file_789",
  "fileName": "example.mp3",
  "fileSize": 1048576,
  "totalChunks": 10,
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "fileId": "file_789",
  "fileName": "example.mp3",
  "fileSize": 1048576,
  "filePath": "/uploads/completed/file_789_example.mp3",
  "uploadedAt": "2024-01-01T12:00:00Z",
  "checksum": "sha256_hash_here"
}
```

## Error Handling

### Error Types

The system handles various error types:

- **Network Errors**: Connection issues, timeouts
- **Server Errors**: HTTP 5xx responses
- **Client Errors**: File validation, authentication
- **System Errors**: Memory, storage issues

### Error Recovery

```typescript
import { createUploadErrorMessage } from '@/lib/upload';

function handleUploadError(error: UploadError) {
  const userMessage = createUploadErrorMessage(error);
  
  if (error.retryable) {
    // Show retry option to user
    showRetryDialog(userMessage, () => {
      // Retry the upload
      retryUpload();
    });
  } else {
    // Show error message with recovery options
    showErrorDialog(userMessage, error.recoveryAction);
  }
}
```

### Common Error Scenarios

1. **Network Disconnection**: Automatic retry with exponential backoff
2. **Server Timeout**: Increased timeout for large files
3. **File Size Limits**: Clear error message with size recommendations
4. **Authentication Failures**: Prompt for re-authentication
5. **Storage Quota**: Provide cleanup guidance

## Mobile Optimization

### Battery Awareness

```typescript
import { useMobileUploadUtils } from '@/lib/upload/mobile-integration';

function BatteryAwareUpload() {
  const { canUpload } = useMobileUploadUtils();

  const handleUpload = async () => {
    const { canUpload, reason } = await canUpload();
    
    if (!canUpload) {
      alert(reason);
      return;
    }
    
    // Proceed with upload
    uploadFile(file);
  };
}
```

### Network Optimization

- **Adaptive Chunking**: Smaller chunks for slow connections
- **Connection Type Detection**: Different settings for WiFi vs cellular
- **Data Saver Mode**: Reduced chunk sizes when data saver is enabled

### Memory Management

- **Chunk Caching**: Intelligent caching with garbage collection
- **Memory Monitoring**: Prevent memory exhaustion on mobile devices
- **Progressive Loading**: Load chunks as needed to minimize memory usage

## Performance Considerations

### Chunk Size Optimization

- **Small Chunks**: Better for unreliable connections, more overhead
- **Large Chunks**: Better for stable connections, less overhead
- **Adaptive Sizing**: Automatically adjust based on network conditions

### Concurrent Uploads

- **Default**: 3 concurrent uploads
- **Mobile**: 2 concurrent uploads
- **Slow Networks**: 1 concurrent upload

### Compression

- **Trade-off**: Reduced bandwidth vs. increased CPU usage
- **Mobile**: Generally disabled due to battery considerations
- **WiFi**: Can be enabled for large files

## Security Considerations

### File Validation

```typescript
import { validateUploadFiles } from '@/lib/upload';

const { valid, invalid } = validateUploadFiles(files);

if (invalid.length > 0) {
  console.error('Invalid files:', invalid);
  // Show validation errors to user
}
```

### Chunk Verification

- **Checksums**: Verify chunk integrity during upload
- **Size Validation**: Ensure chunk sizes match expectations
- **Type Checking**: Validate file types at chunk and file level

### Authentication

- **Session Tokens**: Secure upload session identification
- **Authorization**: Verify user permissions for file uploads
- **Rate Limiting**: Prevent abuse through upload limits

## Testing

### Unit Testing

```typescript
import { ChunkedUploader } from '@/lib/upload';

describe('ChunkedUploader', () => {
  let uploader: ChunkedUploader;

  beforeEach(() => {
    uploader = new ChunkedUploader({
      config: {
        chunkSize: 1024,
        maxConcurrentUploads: 1,
      },
    });
  });

  it('should create chunks correctly', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const sessionId = await uploader.uploadFile(file);
    expect(sessionId).toBeDefined();
  });
});
```

### Integration Testing

- **End-to-End**: Test complete upload flow
- **Network Simulation**: Test various network conditions
- **Error Scenarios**: Test error handling and recovery
- **Mobile Testing**: Test on various mobile devices and connections

## Troubleshooting

### Common Issues

1. **Upload Fails on Mobile**: Check network settings, reduce chunk size
2. **Resume Not Working**: Verify localStorage availability
3. **Slow Uploads**: Check concurrent upload settings, network conditions
4. **Memory Issues**: Reduce chunk cache size, enable garbage collection

### Debug Tools

```typescript
// Enable debug logging
const uploader = new ChunkedUploader({
  enableLogging: true,
  config: {
    // ... configuration
  },
});

// Monitor performance
const { metrics } = useUploadPerformance(sessionId);
console.log('Upload performance:', metrics);

// Get diagnostic information
const { diagnostic } = useUploadPerformance(sessionId);
console.log('Diagnostic info:', diagnostic);
```

## Best Practices

1. **Start Small**: Begin with default configuration, adjust based on needs
2. **Monitor Performance**: Use built-in metrics to optimize settings
3. **Handle Errors Gracefully**: Provide clear error messages and recovery options
4. **Test on Target Devices**: Especially important for mobile applications
5. **Consider User Experience**: Show progress, allow pause/resume, handle interruptions

## Migration Guide

### From Simple Upload

1. Replace direct file upload with chunked upload
2. Add progress tracking UI
3. Implement error handling
4. Add resume capability
5. Test with various file sizes and network conditions

### Integration Steps

1. Install chunked upload system
2. Update file upload components
3. Add server-side endpoints
4. Configure upload settings
5. Add progress UI
6. Test thoroughly
7. Monitor performance
8. Optimize settings

## Conclusion

The chunked file upload system provides a robust solution for handling large file uploads with excellent user experience, especially on mobile devices. The automatic resume capability, network optimization, and comprehensive error handling make it suitable for production use in modern web applications.

For additional support or questions, refer to the API documentation or contact the development team.