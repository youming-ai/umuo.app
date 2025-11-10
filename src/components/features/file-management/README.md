# Mobile File Management System

A comprehensive, touch-optimized file management interface for mobile devices built with React, TypeScript, and Next.js 15. This system provides an efficient way to browse, search, filter, and manage audio files with support for bulk operations and gesture interactions.

## Features

### 📱 Mobile-Optimized Interface
- **Touch-friendly controls**: 44px minimum touch targets for reliable interaction
- **Gesture support**: Swipe actions, long press, and pinch-to-zoom
- **Responsive design**: Optimized for screens 320px and larger
- **Virtual scrolling**: Efficient rendering for large file collections

### 🔍 Advanced Search & Filtering
- **Real-time search**: Instant filtering as you type
- **Multi-criteria filters**: Status, file type, size, and date range
- **Quick filters**: One-tap access to common filter combinations
- **Smart sorting**: By date, name, size, or duration

### ✋ Gesture Interactions
- **Swipe to reveal**: Quick access to file actions
- **Long press selection**: Enter bulk mode with a simple gesture
- **Pinch to zoom**: Zoom in on file previews
- **Pull to refresh**: Update file list with natural gesture

### 📦 Bulk Operations
- **Multi-select**: Select multiple files with checkboxes or gestures
- **Batch processing**: Delete, download, share, or transcribe multiple files
- **Progress tracking**: Real-time progress for bulk operations
- **Confirmation dialogs**: Safe handling of destructive operations

### 🎯 File Preview
- **Zoom and pan**: Detailed file preview with touch controls
- **Metadata display**: Comprehensive file information
- **Quick actions**: Play, share, download from preview
- **Accessibility**: Full screen reader support

### ♿ Accessibility
- **WCAG 2.1 compliant**: Full keyboard navigation support
- **Screen reader**: Comprehensive ARIA labels and announcements
- **High contrast**: Support for high contrast mode
- **Reduced motion**: Respect user motion preferences

## Installation

The mobile file management system is integrated into the main application. No additional installation required.

## Usage

### Basic Implementation

```tsx
import MobileFileManager from "@/components/features/file-management";

export default function FilesPage() {
  return (
    <div className="h-screen">
      <MobileFileManager
        onFileSelect={(fileId) => {
          // Handle file selection (e.g., navigate to player)
          window.location.href = `/player/${fileId}`;
        }}
        allowMultiSelect={true}
        showUploadButton={true}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Configuration

```tsx
import {
  MobileFileManager,
  useMobileFiles,
  useAccessibility,
} from "@/components/features/file-management";

export default function AdvancedFilesPage() {
  const [filters, setFilters] = useState({
    status: "all",
    fileType: "all",
    dateRange: "all",
  });

  const { data: files } = useMobileFiles(filters, "date", "");
  const { announce } = useAccessibility();

  return (
    <MobileFileManager
      onFileSelect={(fileId) => {
        announce(`Opening file ${fileId}`);
        // Custom file handling logic
      }}
      allowMultiSelect={true}
      showUploadButton={false} // Hide upload button if not needed
    />
  );
}
```

## Component Architecture

### Core Components

- **MobileFileManager**: Main container with state management
- **MobileFileGrid**: Virtualized file grid with gesture support
- **MobileFileCard**: Individual file card with swipe actions
- **FileSearch**: Advanced search and filtering interface
- **BulkOperations**: Multi-file action toolbar
- **FilePreview**: Zoomable file preview with metadata

### Hooks

- **useMobileFiles**: TanStack Query integration for file data
- **useMobileFileSelection**: Selection state management
- **useMobileBulkOperations**: Bulk operation mutations
- **useGestures**: Touch gesture handling utilities
- **useAccessibility**: Accessibility features and announcements

### Utilities

- **formatFileSize**: Human-readable file size formatting
- **formatDate**: Relative and absolute date formatting
- **GestureEnhancer**: Touch gesture detection and handling
- **AccessibilityManager**: WCAG compliance utilities

## Performance Optimizations

### Virtual Scrolling
- Efficient rendering of large file collections
- Only visible items are rendered
- Smooth scrolling with minimal memory usage

### Lazy Loading
- File thumbnails loaded on demand
- Progressive image loading
- Background processing for file operations

### Memory Management
- Automatic cleanup of event listeners
- WeakMap for audio URL caching
- Debounced search input handling

### React Optimization
- useMemo for expensive calculations
- useCallback for stable function references
- React.memo for component memoization

## Accessibility Features

### Keyboard Navigation
- Full keyboard support for all interactions
- Arrow key navigation in file grid
- Enter/Space for activation
- Escape for modal closure

### Screen Reader Support
- Comprehensive ARIA labels
- Live regions for dynamic content
- Descriptive announcements for actions
- Proper heading hierarchy

### Visual Accessibility
- High contrast mode support
- Focus indicators
- Sufficient color contrast ratios
- Respect for reduced motion preferences

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Touch support**: Full touch gesture support
- **Progressive enhancement**: Works without JavaScript

## Customization

### Theme Integration
The system uses CSS custom properties for theming:

```css
:root {
  --mobile-file-bg: var(--background);
  --mobile-file-border: var(--border);
  --mobile-file-text: var(--foreground);
  --mobile-file-primary: var(--primary);
  --mobile-file-accent: var(--accent);
}
```

### Custom Gesture Configuration

```tsx
import { gestureEnhancer } from "@/components/features/file-management";

// Customize swipe sensitivity
gestureEnhancer.addSwipeSupport(element, onSwipeLeft, onSwipeRight, {
  threshold: 75, // pixels
  restraint: 100, // pixels
  allowedTime: 300, // milliseconds
});
```

### Custom Accessibility Labels

```tsx
const customLabels = {
  fileCard: {
    select: "Custom select label",
    play: "Custom play label",
    // ... other labels
  },
  // ... other categories
};

const { accessibility } = useAccessibility(customLabels);
```

## Testing

### Unit Tests
```bash
# Run component tests
pnpm test:components

# Run hook tests
pnpm test:hooks
```

### Accessibility Testing
```bash
# Run accessibility audit
pnpm test:a11y

# Run with screen reader simulation
pnpm test:screen-reader
```

### Performance Testing
```bash
# Run performance benchmarks
pnpm test:performance

# Test with large file collections
pnpm test:virtual-scrolling
```

## Troubleshooting

### Common Issues

1. **Gesture not working**
   - Ensure touch events are not preventDefault'd elsewhere
   - Check CSS touch-action property
   - Verify element has proper dimensions

2. **Performance issues with many files**
   - Check virtual scrolling is enabled
   - Verify item keys are stable
   - Monitor memory usage

3. **Accessibility announcements not working**
   - Ensure announce region is properly initialized
   - Check screen reader is enabled
   - Verify ARIA attributes are correct

### Debug Mode

Enable debug logging:

```tsx
// In development
const debug = process.env.NODE_ENV === 'development';
<MobileFileManager debug={debug} />
```

## Contributing

When contributing to the mobile file management system:

1. **Follow mobile-first design principles**
2. **Test on actual mobile devices**
3. **Ensure WCAG 2.1 compliance**
4. **Maintain touch gesture performance**
5. **Test accessibility features**

## License

This component is part of the umuo.app project and follows the project's license terms.

## Support

For issues and questions:
- Check the troubleshooting guide
- Review the component examples
- Open an issue in the project repository