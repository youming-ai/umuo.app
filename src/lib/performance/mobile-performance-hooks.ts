/**
 * React hooks for mobile performance optimization
 * Provides easy integration with React components
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  MobilePerformanceMonitor,
  DeviceProfiler,
  PerformanceOptimizer,
  MemoryManager,
  AnimationOptimizer,
  mobilePerformanceMonitor,
  deviceProfiler,
  performanceOptimizer,
  memoryManager,
  animationOptimizer
} from './mobile-optimization';

import {
  MobilePerformanceIntegrationManager,
  AudioPlayerPerformanceManager,
  FileUploadPerformanceManager,
  TouchFeedbackPerformanceManager,
  mobilePerformanceIntegration
} from './mobile-integration';

import type {
  DeviceProfile,
  PerformanceSettings,
  PerformanceReport,
  ComponentPerformanceConfig,
  AudioPlayerPerformanceConfig,
  FileUploadPerformanceConfig
} from './mobile-optimization';

// Basic performance hook
export function useMobilePerformance(monitoringEnabled: boolean = true) {
  const [metrics, setMetrics] = useState(() => mobilePerformanceMonitor.getCurrentMetrics());
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!monitoringEnabled) return;

    // Start monitoring if not already started
    if (!isMonitoring) {
      mobilePerformanceMonitor.startMonitoring();
      setIsMonitoring(true);
    }

    // Update metrics periodically
    const interval = setInterval(() => {
      const currentMetrics = mobilePerformanceMonitor.getCurrentMetrics();
      setMetrics(currentMetrics);
    }, 1000);

    // Generate detailed report periodically
    const reportInterval = setInterval(() => {
      const currentReport = mobilePerformanceMonitor.getDetailedReport();
      setReport(currentReport);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(reportInterval);
    };
  }, [monitoringEnabled, isMonitoring]);

  const markPerformanceStart = useCallback((name: string) => {
    mobilePerformanceMonitor.markPerformanceStart(name);
  }, []);

  const markPerformanceEnd = useCallback((name: string) => {
    return mobilePerformanceMonitor.markPerformanceEnd(name);
  }, []);

  return {
    metrics,
    report,
    isMonitoring,
    markPerformanceStart,
    markPerformanceEnd
  };
}

// Device profiling hook
export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile>(() => deviceProfiler.getDeviceProfile());

  useEffect(() => {
    // Update profile on window resize
    const handleResize = () => {
      deviceProfiler.updateProfile();
      setProfile(deviceProfiler.getDeviceProfile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isLowEndDevice = useMemo(() => profile.class === 'low-end', [profile.class]);
  const isHighEndDevice = useMemo(() => profile.class === 'high-end' || profile.class === 'flagship', [profile.class]);
  const hasLimitedMemory = useMemo(() => profile.capabilities.memory === 'limited', [profile.capabilities.memory]);
  const hasSlowNetwork = useMemo(() => profile.capabilities.network === 'slow', [profile.capabilities.network]);
  const hasBasicGPU = useMemo(() => profile.capabilities.gpu === 'basic', [profile.capabilities.gpu]);

  return {
    profile,
    settings: profile.recommendedSettings,
    isLowEndDevice,
    isHighEndDevice,
    hasLimitedMemory,
    hasSlowNetwork,
    hasBasicGPU,
    limitations: profile.limitations,
    optimizations: profile.optimizations
  };
}

// Memory management hook
export function useMemoryManagement(componentName: string, maxSize: number = 10) {
  const poolId = `${componentName}-pool`;
  const poolRef = useRef(memoryManager.createPool(poolId, () => ({}), maxSize));

  const allocate = useCallback((name: string, size: number, metadata?: any) => {
    return memoryManager.allocate(`${componentName}-${name}`, size, metadata);
  }, [componentName]);

  const deallocate = useCallback((id: string) => {
    memoryManager.deallocate(id);
  }, []);

  const acquire = useCallback(() => {
    return memoryManager.acquire(poolId);
  }, [poolId]);

  const release = useCallback((object: any) => {
    memoryManager.release(poolId, object);
  }, [poolId]);

  useEffect(() => {
    return () => {
      // Cleanup pool when component unmounts
      const pool = poolRef.current;
      if (pool) {
        while (pool.objects.length > 0) {
          const obj = pool.objects.pop();
          if (obj) {
            // Reset object if needed
            Object.keys(obj).forEach(key => delete obj[key]);
          }
        }
      }
    };
  }, []);

  return {
    allocate,
    deallocate,
    acquire,
    release
  };
}

// Animation optimization hook
export function useAnimationOptimization(targetFPS: number = 60) {
  const [animationStats, setAnimationStats] = useState(() => animationOptimizer.getAnimationStats());
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    animationOptimizer.setTargetFPS(targetFPS);
    setIsOptimized(true);

    const interval = setInterval(() => {
      setAnimationStats(animationOptimizer.getAnimationStats());
    }, 1000);

    return () => {
      clearInterval(interval);
      setIsOptimized(false);
    };
  }, [targetFPS]);

  const scheduleAnimation = useCallback((
    element: HTMLElement,
    keyframes: Keyframe[],
    options?: KeyframeAnimationOptions,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ) => {
    return animationOptimizer.scheduleAnimation(element, keyframes, options, priority);
  }, []);

  const cancelAnimation = useCallback((animationId: string) => {
    animationOptimizer.cancelAnimation(animationId);
  }, []);

  return {
    animationStats,
    isOptimized,
    scheduleAnimation,
    cancelAnimation
  };
}

// Audio player performance hook
export function useAudioPlayerPerformance(
  playerId: string,
  config?: Partial<AudioPlayerPerformanceConfig>
) {
  const managerRef = useRef<AudioPlayerPerformanceManager | null>(null);
  const [metrics, setMetrics] = useState(() => ({
    cachedSegments: 0,
    memoryUsage: 0,
    isActive: false
  }));

  useEffect(() => {
    const manager = mobilePerformanceIntegration.createAudioPlayerManager(playerId, config);
    managerRef.current = manager;

    const interval = setInterval(() => {
      setMetrics(manager.getPerformanceMetrics());
    }, 1000);

    return () => {
      clearInterval(interval);
      manager.cleanup();
    };
  }, [playerId, config]);

  const optimizePlayback = useCallback((audioElement: HTMLAudioElement) => {
    if (managerRef.current) {
      managerRef.current.optimizeAudioPlayback(audioElement);
    }
  }, []);

  const cacheSegment = useCallback((segmentId: string, audioData: ArrayBuffer) => {
    if (managerRef.current) {
      managerRef.current.cacheAudioSegment(segmentId, audioData);
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.startPlaybackOptimization();
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.stopPlaybackOptimization();
    }
  }, []);

  const optimizeSpectrum = useCallback((audioContext: AudioContext, analyser: AnalyserNode) => {
    if (managerRef.current) {
      managerRef.current.optimizeSpectrumAnalysis(audioContext, analyser);
    }
  }, []);

  const getSpectrumData = useCallback((analyser: AnalyserNode) => {
    if (managerRef.current) {
      return managerRef.current.getSpectrumData(analyser);
    }
    return null;
  }, []);

  return {
    metrics,
    optimizePlayback,
    cacheSegment,
    startPlayback,
    stopPlayback,
    optimizeSpectrum,
    getSpectrumData
  };
}

// File upload performance hook
export function useFileUploadPerformance(
  uploadId: string,
  config?: Partial<FileUploadPerformanceConfig>
) {
  const managerRef = useRef<FileUploadPerformanceManager | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [metrics, setMetrics] = useState(() => ({
    totalTasks: 0,
    activeTasks: 0,
    averageUploadSpeed: 0,
    memoryUsage: 0
  }));

  useEffect(() => {
    const manager = mobilePerformanceIntegration.createFileUploadManager(uploadId, config);
    managerRef.current = manager;

    const interval = setInterval(() => {
      setMetrics(manager.getOptimizationMetrics());
    }, 2000);

    const handleProgress = (event: any) => {
      if (event.detail.taskId === uploadId) {
        setProgress(event.detail.progress);
      }
    };

    window.addEventListener('upload-progress', handleProgress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('upload-progress', handleProgress);
      manager.cleanup();
    };
  }, [uploadId, config]);

  const optimizeFileUpload = useCallback((file: File) => {
    if (managerRef.current) {
      return managerRef.current.optimizeFileUpload(file);
    }
    return null;
  }, []);

  const startUpload = useCallback(async (uploadTask: any) => {
    if (managerRef.current) {
      await managerRef.current.startUpload(uploadTask);
    }
  }, []);

  const pauseUpload = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.pauseUpload(uploadId);
    }
  }, [uploadId]);

  const resumeUpload = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.resumeUpload(uploadId);
    }
  }, [uploadId]);

  const cancelUpload = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.cancelUpload(uploadId);
    }
  }, [uploadId]);

  return {
    progress,
    metrics,
    optimizeFileUpload,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload
  };
}

// Touch feedback performance hook
export function useTouchFeedbackPerformance() {
  const [touchMetrics, setTouchMetrics] = useState(() => ({
    averageResponseTime: 0,
    gestureAccuracy: 0,
    totalGestures: 0,
    batteryOptimized: false
  }));

  useEffect(() => {
    const manager = mobilePerformanceIntegration.getTouchFeedbackManager();
    if (!manager) return;

    const interval = setInterval(() => {
      setTouchMetrics(manager.getTouchMetrics());
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const optimizeTouchTarget = useCallback((element: HTMLElement) => {
    const manager = mobilePerformanceIntegration.getTouchFeedbackManager();
    if (manager) {
      manager.optimizeTouchTarget(element);
    }
  }, []);

  const enableGestureRecognition = useCallback((element: HTMLElement, gestures: string[]) => {
    const manager = mobilePerformanceIntegration.getTouchFeedbackManager();
    if (manager) {
      manager.enableGestureRecognition(element, gestures);
    }
  }, []);

  return {
    touchMetrics,
    optimizeTouchTarget,
    enableGestureRecognition
  };
}

// Performance health check hook
export function usePerformanceHealthCheck(interval: number = 30000) {
  const [health, setHealth] = useState(() => mobilePerformanceIntegration.performHealthCheck());
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    const checkHealth = () => {
      const currentHealth = mobilePerformanceIntegration.performHealthCheck();
      setHealth(currentHealth);
      setLastCheck(Date.now());
    };

    checkHealth(); // Initial check
    const intervalId = setInterval(checkHealth, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  const isHealthy = useMemo(() =>
    health.overall === 'excellent' || health.overall === 'good',
    [health.overall]
  );

  const hasIssues = useMemo(() => health.issues.length > 0, [health.issues]);

  return {
    health,
    isHealthy,
    hasIssues,
    lastCheck,
    issues: health.issues,
    recommendations: health.recommendations
  };
}

// Responsive performance hook
export function useResponsivePerformance() {
  const [performanceMode, setPerformanceMode] = useState<'normal' | 'optimized' | 'minimal'>('normal');
  const profile = useDeviceProfile();

  useEffect(() => {
    // Auto-adjust performance mode based on device capabilities
    let mode: 'normal' | 'optimized' | 'minimal' = 'normal';

    if (profile.isLowEndDevice) {
      mode = 'minimal';
    } else if (profile.hasLimitedMemory || profile.hasSlowNetwork) {
      mode = 'optimized';
    }

    setPerformanceMode(mode);
  }, [profile]);

  useEffect(() => {
    // Apply performance mode to document
    document.body.className = document.body.className
      .replace(/performance-mode-\w+/, '')
      .trim();

    document.body.classList.add(`performance-mode-${performanceMode}`);

    // Apply CSS custom properties for performance mode
    const root = document.documentElement;
    switch (performanceMode) {
      case 'minimal':
        root.style.setProperty('--animation-duration-multiplier', '0.5');
        root.style.setProperty('--shadow-complexity', 'none');
        root.style.setProperty('--filter-complexity', 'none');
        break;
      case 'optimized':
        root.style.setProperty('--animation-duration-multiplier', '0.75');
        root.style.setProperty('--shadow-complexity', 'simple');
        root.style.setProperty('--filter-complexity', 'simple');
        break;
      default:
        root.style.setProperty('--animation-duration-multiplier', '1');
        root.style.setProperty('--shadow-complexity', 'full');
        root.style.setProperty('--filter-complexity', 'full');
    }
  }, [performanceMode]);

  const isMinimalMode = useMemo(() => performanceMode === 'minimal', [performanceMode]);
  const isOptimizedMode = useMemo(() => performanceMode === 'optimized', [performanceMode]);

  return {
    performanceMode,
    isMinimalMode,
    isOptimizedMode,
    setPerformanceMode
  };
}

// Battery optimization hook
export function useBatteryOptimization() {
  const [batteryInfo, setBatteryInfo] = useState({
    level: 1.0,
    charging: false,
    lowPowerMode: false
  });

  useEffect(() => {
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();

          const updateBatteryInfo = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
              lowPowerMode: !battery.charging && battery.level < 0.2
            });
          };

          updateBatteryInfo();

          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        } catch (error) {
          console.warn('Battery API not available');
        }
      }
    };

    const cleanup = checkBattery();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const isLowBattery = useMemo(() => batteryInfo.level < 0.2, [batteryInfo.level]);
  const shouldOptimize = useMemo(() =>
    batteryInfo.lowPowerMode || isLowBattery,
    [batteryInfo.lowPowerMode, isLowBattery]
  );

  return {
    batteryInfo,
    isLowBattery,
    shouldOptimize
  };
}

// Network optimization hook
export function useNetworkOptimization() {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    online: navigator.onLine
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      setNetworkInfo({
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 100,
        saveData: connection?.saveData || false,
        online: navigator.onLine
      });
    };

    updateNetworkInfo();

    // Listen for network changes
    const handleOnline = () => {
      setNetworkInfo(prev => ({ ...prev, online: true }));
    };

    const handleOffline = () => {
      setNetworkInfo(prev => ({ ...prev, online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  const isSlowNetwork = useMemo(() =>
    networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g',
    [networkInfo.effectiveType]
  );

  const isFastNetwork = useMemo(() =>
    networkInfo.effectiveType === '4g' && networkInfo.downlink > 5,
    [networkInfo.effectiveType, networkInfo.downlink]
  );

  const shouldCompress = useMemo(() =>
    isSlowNetwork || networkInfo.saveData,
    [isSlowNetwork, networkInfo.saveData]
  );

  return {
    networkInfo,
    isSlowNetwork,
    isFastNetwork,
    shouldCompress,
    isOnline: networkInfo.online
  };
}

// Comprehensive performance hook that combines all optimizations
export function useMobilePerformanceOptimization(options: {
  enableMonitoring?: boolean;
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
  componentType?: 'audio-player' | 'file-upload' | 'ui-component';
} = {}) {
  const {
    enableMonitoring = true,
    enableHealthCheck = true,
    healthCheckInterval = 30000,
    componentType = 'ui-component'
  } = options;

  const performance = useMobilePerformance(enableMonitoring);
  const device = useDeviceProfile();
  const memory = useMemoryManagement(componentType);
  const animation = useAnimationOptimization(device.settings.animations.fps);
  const health = usePerformanceHealthCheck(enableHealthCheck ? healthCheckInterval : 0);
  const responsive = useResponsivePerformance();
  const battery = useBatteryOptimization();
  const network = useNetworkOptimization();

  // Auto-apply optimizations based on conditions
  useEffect(() => {
    // Apply battery optimizations
    if (battery.shouldOptimize) {
      responsive.setPerformanceMode('minimal');
      animationOptimizer.setTargetFPS(30);
    } else if (device.isLowEndDevice) {
      responsive.setPerformanceMode('optimized');
      animationOptimizer.setTargetFPS(45);
    } else {
      responsive.setPerformanceMode('normal');
      animationOptimizer.setTargetFPS(60);
    }
  }, [battery.shouldOptimize, device.isLowEndDevice, responsive, animation]);

  // Apply network optimizations
  useEffect(() => {
    if (network.isSlowNetwork) {
      // Emit events for network optimization
      window.dispatchEvent(new CustomEvent('slow-network-detected', {
        detail: { effectiveType: network.networkInfo.effectiveType }
      }));
    }
  }, [network.isSlowNetwork]);

  // Performance marking utilities
  const markPerformance = useCallback((operation: string, fn: () => void | Promise<void>) => {
    performance.markPerformanceStart(operation);

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.finally(() => {
          performance.markPerformanceEnd(operation);
        });
      } else {
        performance.markPerformanceEnd(operation);
        return result;
      }
    } catch (error) {
      performance.markPerformanceEnd(operation);
      throw error;
    }
  }, [performance]);

  return {
    // Basic performance data
    performance: performance.metrics,
    device: device.profile,
    health: health.health,

    // Optimization states
    isOptimized: responsive.isOptimizedMode || responsive.isMinimalMode,
    performanceMode: responsive.performanceMode,

    // Battery and network states
    batteryOptimized: battery.shouldOptimize,
    networkOptimized: network.isSlowNetwork,

    // Utilities
    markPerformance,

    // Individual hooks
    hooks: {
      performance,
      device,
      memory,
      animation,
      health,
      responsive,
      battery,
      network
    }
  };
}

// Export all hooks
export {
  useMobilePerformance as default,
  useDeviceProfile,
  useMemoryManagement,
  useAnimationOptimization,
  useAudioPlayerPerformance,
  useFileUploadPerformance,
  useTouchFeedbackPerformance,
  usePerformanceHealthCheck,
  useResponsivePerformance,
  useBatteryOptimization,
  useNetworkOptimization
};
