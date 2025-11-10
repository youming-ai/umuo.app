# Performance Dashboard Components

Comprehensive system performance monitoring and optimization dashboard for the umuo.app language learning platform.

## Overview

The Performance Dashboard provides real-time monitoring, analytics, and optimization insights across all aspects of the transcription system including system resources, transcription performance, database operations, mobile performance, and user experience metrics.

## Components

### Core Dashboard

#### `PerformanceDashboard`
Main dashboard component that integrates all monitoring features:
- Real-time metrics display with auto-refresh
- System performance monitoring (CPU, memory, storage, network, battery)
- Transcription performance analytics
- Database performance tracking
- Mobile performance optimization metrics
- Alert management and notifications
- Interactive charts and data visualization
- Export and reporting capabilities
- Mobile-responsive design

**Props:**
```typescript
interface PerformanceDashboardProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
  configuration?: Partial<DashboardConfiguration>;
}
```

### Metric Display Components

#### `MetricCard` Family
Specialized metric cards for different performance categories:

- **`BaseMetricCard`** - Foundation for all metric displays
- **`SystemMetricCard`** - CPU, memory, storage metrics
- **`MemoryMetricCard`** - Memory usage with progress indicators
- **`NetworkMetricCard`** - Network latency and bandwidth metrics
- **`TranscriptionMetricCard`** - Transcription speed and accuracy
- **`DatabaseMetricCard`** - Query performance and cache metrics
- **`MobileMetricCard`** - Touch response and battery metrics

#### `MetricGrid`
Responsive grid layout for displaying multiple metrics:
```typescript
interface MetricGridProps {
  metrics: PerformanceMetric[];
  onMetricClick?: (metric: PerformanceMetric) => void;
  columns?: number;
  compact?: boolean;
  showProgress?: boolean;
}
```

#### `MetricSummary`
Summary component showing overall health statistics and metric distribution.

### Data Visualization

#### `PerformanceChart`
Universal chart component supporting multiple visualization types:
- **Line charts** - Time series data
- **Bar charts** - Categorical comparisons
- **Area charts** - Filled line charts
- **Pie charts** - Distribution analysis
- **Radar charts** - Multi-dimensional metrics
- **Gauge charts** - Single metric indicators

**Pre-configured charts:**
- `SystemMetricsChart` - System performance over time
- `TranscriptionMetricsChart` - Transcription analytics
- `DatabaseMetricsChart` - Database performance
- `MobileMetricsChart` - Mobile device metrics
- `PerformanceStatusPieChart` - Status distribution
- `ResourceUsageGaugeChart` - Resource utilization gauges

### Alert Management

#### `AlertPanel`
Comprehensive alert management system:
- Real-time alert notifications
- Alert filtering and search
- Bulk alert operations
- Alert acknowledgment and resolution
- Severity-based prioritization
- Recommendation display
- Alert history and trends

### Configuration

#### `SettingsPanel`
Dashboard configuration and settings:
- General display settings
- Real-time monitoring configuration
- Performance thresholds management
- Notification channel setup
- Advanced debugging options
- Import/export settings

## Real-time Monitoring

### `RealtimePerformanceMonitor`
Core monitoring system with:
- WebSocket and polling support
- Batch processing and compression
- Data validation and anomaly detection
- Automatic reconnection
- Event-driven architecture
- Performance optimization

### React Hook

```typescript
const {
  connectionState,
  metrics,
  alerts,
  statistics,
  isConnected,
  isConnecting
} = useRealtimeMonitoring(config);
```

## Export and Reporting

### `ExportReportingManager`
Comprehensive export and reporting system:
- Multiple export formats (JSON, CSV, Excel, PDF, HTML)
- Scheduled report generation
- Custom report templates
- Performance analytics
- Health check reports
- Trend analysis

### React Hook

```typescript
const {
  exportData,
  generateReport,
  scheduleReport,
  isExporting,
  exportProgress,
  scheduledReports
} = useExportReporting();
```

## TypeScript Types

Comprehensive type definitions for:
- Performance metrics and categories
- Alert system and severity levels
- Dashboard configuration
- Real-time monitoring settings
- Export and reporting options
- Chart configurations
- Mobile performance metrics

## Usage Examples

### Basic Dashboard Setup

```typescript
import { PerformanceDashboard } from '@/components/admin';

function App() {
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);

  return (
    <div>
      <button onClick={() => setIsDashboardVisible(!isDashboardVisible)}>
        Toggle Dashboard
      </button>
      
      <PerformanceDashboard
        isVisible={isDashboardVisible}
        onToggleVisibility={() => setIsDashboardVisible(!isDashboardVisible)}
        configuration={{
          refreshInterval: 5000,
          timeRange: 300000,
          autoRefresh: true,
          theme: 'auto'
        }}
      />
    </div>
  );
}
```

### Custom Metrics Display

```typescript
import { MetricGrid, createMetricCard } from '@/components/admin';

function CustomMetricsPanel({ metrics }) {
  return (
    <MetricGrid
      metrics={metrics}
      onMetricClick={(metric) => console.log('Clicked:', metric)}
      columns={3}
      showProgress={true}
    />
  );
}
```

### Real-time Monitoring

```typescript
import { useRealtimeMonitoring } from '@/components/admin';

function MonitoringStatus() {
  const { connectionState, isConnected, statistics } = useRealtimeMonitoring({
    enabled: true,
    polling: {
      interval: 5000,
      enabledMetrics: ['cpu_usage', 'memory_usage']
    }
  });

  return (
    <div>
      <div>Status: {connectionState}</div>
      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      <div>Last Sync: {statistics?.lastSync.toLocaleString()}</div>
    </div>
  );
}
```

### Export and Reporting

```typescript
import { useExportReporting } from '@/components/admin';

function ReportGenerator({ metrics, alerts }) {
  const { exportData, generateReport, isExporting } = useExportReporting();

  const handleExport = async () => {
    const blob = await exportData(
      { metrics, alerts },
      'pdf',
      {
        timeRange: 3600000,
        includeAlerts: true,
        includeRawData: true
      }
    );
    
    // Download the file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.pdf`;
    a.click();
  };

  const generateCustomReport = async () => {
    const report = await generateReport('executive_summary', {
      metrics,
      alerts,
      systemMetrics: {/* ... */},
      transcriptionMetrics: {/* ... */},
      databaseMetrics: {/* ... */},
      mobileMetrics: {/* ... */},
      timeRange: 3600000
    });
    
    console.log('Generated report:', report);
  };

  return (
    <div>
      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      
      <button onClick={generateCustomReport}>
        Generate Report
      </button>
    </div>
  );
}
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  dashboard: {
    refreshInterval: 5000,    // 5 seconds
    timeRange: 300000,       // 5 minutes
    autoRefresh: true,
    compact: false,
    theme: 'auto'
  },
  monitoring: {
    enabled: true,
    polling: {
      interval: 5000,
      enabledMetrics: ['cpu_usage', 'memory_usage', 'network_latency']
    }
  },
  alerts: {
    enabled: true,
    notifications: {
      email: { enabled: false },
      push: { enabled: true },
      webhook: { enabled: false }
    }
  }
};
```

### Performance Thresholds

```typescript
const thresholds = {
  cpu: { excellent: 20, good: 50, fair: 80, poor: 95 },
  memory: { excellent: 30, good: 60, fair: 80, poor: 90 },
  network: { excellent: 50, good: 100, fair: 200, poor: 500 },
  battery: { excellent: 80, good: 50, fair: 20, poor: 10 }
};
```

## Mobile Optimization

The dashboard is fully optimized for mobile devices with:
- Responsive design with touch-friendly controls
- Performance-optimized rendering for low-end devices
- Adaptive metric density based on screen size
- Gesture support for chart interaction
- Battery-aware refresh intervals
- Reduced motion support for accessibility

## Integration with Existing Systems

The performance dashboard integrates seamlessly with:
- **Error Handling System** - Error analytics and recovery strategies
- **Mobile Performance Hooks** - Mobile-specific optimization metrics
- **Database Layer** - IndexedDB performance monitoring
- **AI Services** - Transcription performance tracking
- **Player System** - Audio playback performance metrics

## Accessibility

- WCAG 2.1 AA compliant design
- Keyboard navigation support
- Screen reader compatibility
- High contrast theme support
- Focus management
- ARIA labels and descriptions

## Performance Considerations

- Optimized rendering with React.memo and useMemo
- Efficient data aggregation and filtering
- Lazy loading of chart components
- Batch processing for real-time updates
- Memory leak prevention
- Minimal impact on application performance

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new features to the performance dashboard:

1. Follow the established component patterns
2. Add comprehensive TypeScript types
3. Include accessibility features
4. Test on mobile devices
5. Document new configurations
6. Update the README with examples

## License

This component is part of the umuo.app project and follows the same licensing terms.