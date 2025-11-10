# Mobile File Upload System

A comprehensive mobile-optimized file upload system for umuo.app with touch interactions, chunked uploads, and resume capabilities.

## Features

### 🎯 Mobile-First Design
- Touch-optimized interface with 44px minimum touch targets
- Gesture support (swipe to delete, tap to select)
- Haptic feedback for user interactions
- Responsive design for screens 320px and larger
- Mobile-specific upload settings (WiFi-only mode)

### 📁 File Support
- **Audio formats**: MP3, WAV, M4A, OGG, FLAC, AAC
- **Video formats**: MP4, MOV, WebM
- **Document formats**: PDF, TXT, DOC, DOCX
- File validation with size limits and format checking
- Real-time validation feedback

### ⚡ Performance Features
- Chunked uploads with resume capability
- Progress tracking with pause/resume functionality
- Network status awareness
- Battery-conscious processing
- Background upload support

### 🔧 Advanced Features
- Auto-transcription integration
- Multiple file upload support
- Drag-and-drop with mobile fallbacks
- Offline upload queuing
- Automatic retry on network recovery

## Components

### MobileFileUpload
The main component that orchestrates the entire upload experience.

```tsx
import { MobileFileUpload } from '@/components/features/file-upload';

<MobileFileUpload
  onSuccess={(files) => console.log('Uploaded:', files)}
  onError={(error) => console.error('Upload failed:', error)}
  validationOptions={{
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowAudio: true,
    allowVideo: false,
    maxFileCount: 5
  }}
  showAdvancedOptions={true}
  autoStartUpload={true}
/>
```

### FileDropZone
Touch-optimized drag-and-drop area with gesture support.

```tsx
import { FileDropZone } from '@/components/features/file-upload';

<FileDropZone
  onFilesSelected={handleFilesSelected}
  isUploading={isUploading}
  validationOptions={{
    allowAudio: true,
    allowVideo: true,
    maxSize: 50 * 1024 * 1024
  }}
  maxFiles={3}
/>
```

### FilePreview
File list with swipe gestures and mobile interactions.

```tsx
import { FilePreview } from '@/components/features/file-upload';

<FilePreview
  files={selectedFiles}
  onRemoveFile={handleRemoveFile}
  onViewFile={handleViewFile}
  onRetryFile={handleRetryFile}
  mobileOptimized={true}
  showActions={true}
/>
```

### UploadProgress
Progress tracking with resume capabilities.

```tsx
import { UploadProgress } from '@/components/features/file-upload';

<UploadProgress
  progress={uploadProgress}
  isUploading={isUploading}
  canRetry={true}
  onCancel={handleCancel}
  onRetry={handleRetry}
  mobileOptimized={true}
/>
```

## Hooks

### useMobileFileUpload
Custom hook for upload state management.

```tsx
import { useMobileFileUpload } from '@/components/features/file-upload';

const upload = useMobileFileUpload({
  maxFileSize: 100 * 1024 * 1024,
  onSuccess: (files) => console.log('Success'),
  onError: (error) => console.error('Error'),
});

// Usage
upload.uploadFiles(files);
upload.cancelUpload();
upload.retryUpload();
```

### useHapticFeedback
Hook for mobile haptic feedback.

```tsx
import { useHapticFeedback } from '@/components/features/file-upload';

const { triggerHaptic } = useHapticFeedback();

triggerHaptic('light');   // Light vibration
triggerHaptic('medium');  // Medium vibration
triggerHaptic('heavy');   // Heavy vibration
triggerHaptic('success'); // Success pattern
triggerHaptic('error');   // Error pattern
```

## File Validation

The system includes comprehensive file validation:

```tsx
import { 
  validateFile, 
  validateFiles,
  formatFileSize,
  getSupportedFormatsText 
} from '@/components/features/file-upload';

// Validate single file
const result = validateFile(file, {
  maxFileSize: 100 * 1024 * 1024,
  allowAudio: true,
  allowVideo: false
});

// Validate multiple files
const { validFiles, invalidFiles, results } = validateFiles(files, options);
```

## Mobile Gestures

### Swipe Actions
- **Swipe Left**: Remove file from upload queue
- **Swipe Right**: Preview file (when supported)
- **Tap**: Select file for upload
- **Long Press**: Show file details

### Touch Feedback
- Ripple effects on touch
- Haptic feedback for all interactions
- Visual feedback for drag-and-drop
- Smooth animations and transitions

## Accessibility Features

- **Screen Reader Support**: Full ARIA labels and descriptions
- **Keyboard Navigation**: Complete keyboard accessibility
- **High Contrast Mode**: WCAG AA compliant colors
- **Voice Control**: Voice command compatibility
- **Touch Target Size**: 44px minimum targets

## Mobile Optimization

### Performance
- Lazy loading of components
- Efficient file handling
- Memory management for large files
- Battery-conscious upload strategies

### Network Awareness
- WiFi-only upload mode
- Network status monitoring
- Automatic retry on reconnection
- Progressive upload for unstable connections

### Storage Management
- Efficient memory usage
- File chunking for large uploads
- Resume capability for interrupted uploads
- Background processing support

## Integration with umuo.app

The mobile file upload system seamlessly integrates with:

- **File Management**: Existing file database and state management
- **Transcription Services**: Automatic transcription after upload
- **TanStack Query**: Server state synchronization
- **IndexedDB**: Client-side file storage
- **Theme System**: Consistent with app theming

## Browser Support

- **Modern Browsers**: Full feature support
- **Mobile Browsers**: Optimized for iOS Safari and Android Chrome
- **Progressive Enhancement**: Graceful degradation on older browsers
- **Touch Events**: Full touch event support
- **File API**: HTML5 File API support required

## Examples

### Basic Usage
```tsx
import { MobileFileUpload } from '@/components/features/file-upload';

export default function UploadPage() {
  return (
    <div className="container mx-auto p-4">
      <MobileFileUpload
        onSuccess={(files) => {
          // Handle successful upload
          files.forEach(file => {
            // Navigate to player or transcription
          });
        }}
        validationOptions={{
          allowAudio: true,
          maxFileSize: 50 * 1024 * 1024,
          maxFileCount: 3
        }}
      />
    </div>
  );
}
```

### Advanced Configuration
```tsx
import { MobileFileUpload } from '@/components/features/file-upload';

export default function AdvancedUpload() {
  return (
    <MobileFileUpload
      showAdvancedOptions={true}
      autoStartUpload={false}
      compactMode={false}
      validationOptions={{
        maxFileSize: 200 * 1024 * 1024,
        maxTotalSize: 1024 * 1024 * 1024, // 1GB
        allowAudio: true,
        allowVideo: true,
        allowDocuments: true,
        maxFileCount: 10
      }}
      onSuccess={(files) => {
        // Custom success handling
        toast.success(`Uploaded ${files.length} files`);
      }}
      onError={(error) => {
        // Custom error handling
        toast.error(`Upload failed: ${error.message}`);
      }}
    />
  );
}
```

## Best Practices

1. **File Size Limits**: Set appropriate limits for mobile connections
2. **Network Awareness**: Use WiFi-only mode for large files
3. **Progress Feedback**: Always provide clear progress indication
4. **Error Handling**: Graceful error recovery and retry mechanisms
5. **User Feedback**: Haptic feedback and visual confirmations
6. **Battery Optimization**: Background processing for long uploads
7. **Storage Management**: Clean up temporary files after upload

## Troubleshooting

### Common Issues

1. **Upload Fails on Mobile**: Check network settings and file size limits
2. **Swipe Gestures Not Working**: Ensure touch events are not blocked
3. **Haptic Feedback Not Working**: Check device vibration permissions
4. **File Validation Fails**: Verify file formats and size limits
5. **Progress Not Updating**: Check network status and upload state

### Debug Mode

Enable debug mode for detailed logging:

```tsx
<MobileFileUpload 
  debugMode={true}
  onProgress={(progress) => console.log('Progress:', progress)}
/>
```

## Future Enhancements

- [ ] WebAssembly for faster file processing
- [ ] Service Worker for background uploads
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] File compression before upload
- [ ] Advanced file preview (waveforms for audio)
- [ ] Batch upload with queue management
- [ ] Upload analytics and performance metrics