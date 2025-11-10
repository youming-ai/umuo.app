/**
 * Mobile performance optimization module exports
 * Comprehensive performance optimization system for mobile devices
 */

// Core performance optimization classes
export {
  MobilePerformanceMonitor,
  DeviceProfiler,
  PerformanceOptimizer,
  MemoryManager,
  AnimationOptimizer,
  mobilePerformanceMonitor,
  deviceProfiler,
  performanceOptimizer,
  memoryManager,
  animationOptimizer,
  initializeMobilePerformanceOptimization,
  cleanupMobilePerformanceOptimization,
  getPerformanceDebugInfo
} from './mobile-optimization';

// Integration with existing components
export {
  AudioPlayerPerformanceManager,
  FileUploadPerformanceManager,
  TouchFeedbackPerformanceManager,
  MobilePerformanceIntegrationManager,
  mobilePerformanceIntegration,
  MobilePerformanceIntegrationManager as default
} from './mobile-integration';

// React hooks for easy integration
export {
  useMobilePerformance,
  useDeviceProfile,
  useMemoryManagement,
  useAnimationOptimization,
  useAudioPlayerPerformance,
  useFileUploadPerformance,
  useTouchFeedbackPerformance,
  usePerformanceHealthCheck,
  useResponsivePerformance,
  useBatteryOptimization,
  useNetworkOptimization,
  useMobilePerformanceOptimization,
  useMobilePerformanceOptimization as default
} from './mobile-performance-hooks';

// Type exports
export type {
  PerformanceReport,
  TouchPerformanceMetrics,
  MemoryPerformanceMetrics,
  AnimationPerformanceMetrics,
  NetworkPerformanceMetrics,
  BatteryPerformanceMetrics,
  PerformanceRecommendation,
  DeviceClass,
  DeviceProfile,
  PerformanceSettings,
  ComponentPerformanceConfig,
  AudioPlayerPerformanceConfig,
  FileUploadPerformanceConfig
} from './mobile-optimization';

// Legacy exports for compatibility
export { performanceMonitor } from './performance-monitor';
