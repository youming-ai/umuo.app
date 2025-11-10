# Bulk File Operations System

A comprehensive, mobile-optimized bulk file operations interface for the umuo.app language learning application. This system provides efficient multi-file management with touch-friendly controls, real-time progress tracking, and intelligent optimizations.

## Features

### 🎯 Core Functionality
- **Multi-file Selection**: Touch-optimized selection with long-press, range selection, and keyboard shortcuts
- **Bulk Operations**: Delete, download, share, transcribe, move, copy, export, organize, compress, extract
- **Real-time Progress**: Live progress tracking with ETA, transfer rates, and individual file status
- **Smart Confirmation**: Detailed confirmation dialogs with file previews and system condition warnings
- **Mobile Optimization**: Battery-aware processing, network quality adaptation, memory management

### 📱 Mobile-First Design
- **Touch Gestures**: Long-press to select, swipe actions, haptic feedback
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Performance Optimization**: Chunked processing, background operations, memory management
- **Network Awareness**: Optimizes for mobile data, adapts to connection quality
- **Battery Optimization**: Reduces processing on low battery, quality adjustments

### ♿ Accessibility
- **Screen Reader Support**: Comprehensive ARIA labels and progress announcements
- **Keyboard Navigation**: Full keyboard shortcuts and tab navigation
- **Visual Enhancements**: High contrast mode, large text, reduced motion options
- **Voice Control**: Compatible with voice control systems

## Architecture

### Component Structure
```
src/components/features/file-operations/
├── BulkOperations.tsx          # Main orchestration component
├── FileSelector.tsx            # Touch-optimized file selection
├── OperationProgress.tsx       # Real-time progress tracking
├── ConfirmationDialog.tsx      # Operation confirmation with previews
├── BulkActions.tsx             # Available actions and shortcuts
├── hooks.ts                    # State management hooks
├── utils.ts                    # Progress tracking and mobile optimization
├── types.ts                    # TypeScript type definitions
└── index.ts                    # Module exports
```

### Data Flow
```
File Selection → Action Selection → Confirmation → Queue Processing → Progress Tracking → Completion
```

## Usage

### Basic Implementation

```tsx
import BulkOperations from "@/components/features/file-operations";

function FileManager() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  
  const handleSelectionChange = (selectionState: SelectionState) => {
    console.log("Selected files:", selectionState.selectedFiles);
  };

  const handleOperationComplete = (result: OperationResult) => {
    console.log("Operation completed:", result);
  };

  return (
    <BulkOperations
      files={files}
      onSelectionChange={handleSelectionChange}
      onOperationComplete={handleOperationComplete}
      showFileSelector={true}
      showProgressBar={true}
      showConfirmationDialog={true}
      mobileOptimizations={{
        enableBatteryOptimization: true,
        optimizeForMobileData: true,
        enableMemoryOptimization: true,
      }}
      accessibilityFeatures={{
        enableKeyboardShortcuts: true,
        announceProgress: true,
      }}
    />
  );
}
```

### Advanced Configuration

```tsx
const customActions: BulkAction[] = [
  createBulkAction({
    id: "custom-compress",
    type: "compress",
    label: "压缩文件",
    icon: Archive,
    description: "将选中的文件压缩为ZIP格式",
    requiresConfirmation: true,
    priority: "normal",
    isAvailable: (files) => files.length > 0,
    config: {
      enableChunking: true,
      maxConcurrency: 2,
    },
  }),
];

<BulkOperations
  files={files}
  customActions={customActions}
  disabledActions={["delete"]} // Disable delete action
  onOperationStart={(config) => {
    console.log("Starting operation:", config.type);
  }}
  onOperationError={(error, operationId) => {
    console.error("Operation failed:", error, operationId);
  }}
/>
```

## Components

### BulkOperations
Main orchestration component that manages the entire bulk operations workflow.

**Props:**
- `files: FileInfo[]` - Array of files to operate on
- `onSelectionChange?: (selection: SelectionState) => void` - Selection change handler
- `onOperationStart?: (config: BulkOperationConfig) => void` - Operation start handler
- `onOperationComplete?: (result: OperationResult) => void` - Completion handler
- `mobileOptimizations?: Partial<MobileOptimizations>` - Mobile optimization settings
- `accessibilityFeatures?: Partial<AccessibilityFeatures>` - Accessibility settings

### FileSelector
Touch-optimized multi-file selection interface with gesture support.

**Props:**
- `files: FileInfo[]` - Files to display
- `selectionState: SelectionState` - Current selection state
- `onSelectionChange: (selection: SelectionState) => void` - Selection change handler
- `selectionMode?: SelectionMode` - Selection mode (single/multiple/range)
- `touchMode?: TouchMode` - Touch interaction mode
- `enableDragSelection?: boolean` - Enable drag selection
- `longPressDelay?: number` - Long press delay in ms

### OperationProgress
Real-time progress tracking for bulk operations with mobile optimizations.

**Props:**
- `operations: OperationProgress[]` - Active operations
- `onCancel?: (operationId: string) => void` - Cancel handler
- `onPause?: (operationId: string) => void` - Pause handler
- `onResume?: (operationId: string) => void` - Resume handler
- `showEstimatedTime?: boolean` - Show ETA
- `showTransferRate?: boolean` - Show transfer rates
- `compactMode?: boolean` - Compact display mode

### ConfirmationDialog
Operation confirmation with file previews and system condition warnings.

**Props:**
- `dialog: ConfirmationDialog` - Dialog configuration
- `onDialogChange: (dialog: ConfirmationDialog) => void` - Dialog state change
- `showFilePreviews?: boolean` - Show file previews
- `showProgressEstimate?: boolean` - Show time estimates
- `enableVibration?: boolean` - Enable haptic feedback

### BulkActions
Available bulk actions with keyboard shortcuts and mobile optimization.

**Props:**
- `selectedFiles: FileInfo[]` - Currently selected files
- `availableActions: BulkAction[]` - Available actions
- `onActionExecute: (action: BulkAction, files: FileInfo[]) => void` - Action handler
- `layout?: "horizontal" | "vertical" | "grid"` - Button layout
- `showLabels?: boolean` - Show action labels
- `enableKeyboardShortcuts?: boolean` - Enable keyboard shortcuts

## Hooks

### useBulkSelection
Manages file selection state with mobile-optimized touch interactions.

```tsx
const { selectionState, toggleFileSelection, selectAll, clearSelection } = useBulkSelection(
  files,
  mobileOptimizations
);
```

### useBulkOperationsQueue
Manages operation queue with concurrent processing and prioritization.

```tsx
const { 
  queue, 
  activeOperations, 
  addToQueue, 
  processQueue, 
  cancelOperation 
} = useBulkOperationsQueue();
```

### useBulkDelete
Handles bulk file deletion with progress tracking and error handling.

```tsx
const bulkDelete = useBulkDelete();

bulkDelete.mutate({
  fileIds: [1, 2, 3],
  onProgress: (current, total, message) => {
    console.log(`Progress: ${current}/${total} - ${message}`);
  }
});
```

## Utilities

### ProgressTracker
Tracks operation progress with history and ETA calculation.

```tsx
const tracker = new ProgressTracker();

tracker.registerCallback(operationId, (progress) => {
  console.log("Progress updated:", progress);
});

const percentage = tracker.getProgressPercentage(progress);
const eta = tracker.calculateEstimatedCompletion(progress);
```

### MobileOptimizer
Optimizes operations for mobile devices with battery and network awareness.

```tsx
const optimizer = new MobileOptimizer();

const config = optimizer.optimizeOperationConfig(baseConfig, {
  enableBatteryOptimization: true,
  optimizeForMobileData: true,
});

const networkQuality = optimizer.getNetworkQuality();
const shouldPause = optimizer.shouldPauseOperation();
```

### FileOperationUtils
Utility functions for file operations and formatting.

```tsx
import { FileOperationUtils } from "./utils";

const formattedSize = FileOperationUtils.formatFileSize(1024 * 1024); // "1 MB"
const formattedDuration = FileOperationUtils.formatDuration(65000); // "1m 5s"
const summary = FileOperationUtils.createOperationSummary(files, "transcribe");
```

## Mobile Optimizations

### Battery Optimization
- **Low Battery Detection**: Automatically reduces processing intensity
- **Charging Awareness**: Increases processing when device is charging
- **Quality Adjustment**: Reduces quality settings to save power

### Network Optimization
- **Connection Quality**: Adapts chunk sizes and concurrency based on network
- **Mobile Data Detection**: Optimizes for data usage with smaller chunks
- **Offline Support**: Handles network interruptions gracefully

### Memory Optimization
- **Chunked Processing**: Processes files in chunks to reduce memory usage
- **Garbage Collection**: Proactive memory cleanup during operations
- **Cache Management**: Intelligent caching with size limits

### Touch Optimization
- **Long Press Selection**: Intuitive long-press to select files
- **Swipe Actions**: Quick actions with swipe gestures
- **Haptic Feedback**: Tactile feedback for better user experience

## Accessibility Features

### Screen Reader Support
- **Progress Announcements**: Real-time progress updates for screen readers
- **Selection Changes**: Announces file selection changes
- **Operation Status**: Detailed operation status announcements

### Keyboard Navigation
- **Full Keyboard Access**: All features accessible via keyboard
- **Shortcuts**: Quick keyboard shortcuts for common actions
- **Tab Navigation**: Logical tab order through all elements

### Visual Enhancements
- **High Contrast**: Enhanced contrast mode for better visibility
- **Large Text**: Support for large text preferences
- **Reduced Motion**: Option to reduce animations and transitions

## Performance Considerations

### Large File Handling
- **Chunked Processing**: Files are processed in configurable chunks
- **Memory Management**: Efficient memory usage for large file batches
- **Background Processing**: Operations continue in background when possible

### Concurrency Control
- **Configurable Limits**: Control maximum concurrent operations
- **Priority Queue**: High-priority operations are processed first
- **Resource Management**: Balances CPU and memory usage

### Error Handling
- **Graceful Degradation**: Continues processing when individual files fail
- **Detailed Error Reporting**: Comprehensive error information
- **Retry Logic**: Automatic retry with exponential backoff

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Required APIs**: File API, IndexedDB, Web Workers (optional)

## Contributing

When contributing to the bulk operations system:

1. **Mobile First**: Always consider mobile users and touch interactions
2. **Accessibility**: Ensure all features are accessible to screen readers
3. **Performance**: Test with large file sets and slow networks
4. **Error Handling**: Handle all error cases gracefully
5. **Documentation**: Update documentation for new features

## License

This component is part of the umuo.app project and follows the project's licensing terms.