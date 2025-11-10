"use client";

import { useState, useEffect, useCallback } from "react";

interface DeviceCapabilities {
  // Hardware capabilities
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number | null;
  pointer: boolean | null;

  // Storage capabilities
  storageQuota: {
    quota: number | null;
    usage: number | null;
    available: number | null;
    persistent: boolean;
  };

  // Camera capabilities
  cameras: {
    count: number;
    hasFrontCamera: boolean;
    hasBackCamera: boolean;
    hasFlash: boolean;
    hasAutoFocus: boolean;
    maxVideoResolution: { width: number; height: number } | null;
    maxPhotoResolution: { width: number; height: number } | null;
  };

  // Audio capabilities
  audio: {
    hasMicrophone: boolean;
    hasSpeakers: boolean;
    maxChannels: number | null;
    supportedCodecs: string[];
  };

  // Connectivity
  connectivity: {
    hasBluetooth: boolean;
    hasWiFi: boolean;
    hasCellular: boolean;
    hasUSB: boolean;
  };

  // Platform information
  platform: {
    os: string;
    architecture: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown';
    vendor: string;
    model: string;
  };

  // Performance characteristics
  performance: {
    isLowEndDevice: boolean;
    canHandleLargeFiles: boolean;
    recommendedMaxConcurrentOperations: number;
    recommendedMaxFileSize: number;
  };
}

interface CapabilityCheckResult {
  supported: boolean;
  reason?: string;
  fallback?: string;
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    deviceMemory: null,
    hardwareConcurrency: null,
    maxTouchPoints: null,
    pointer: null,
    storageQuota: {
      quota: null,
      usage: null,
      available: null,
      persistent: false
    },
    cameras: {
      count: 0,
      hasFrontCamera: false,
      hasBackCamera: false,
      hasFlash: false,
      hasAutoFocus: false,
      maxVideoResolution: null,
      maxPhotoResolution: null
    },
    audio: {
      hasMicrophone: false,
      hasSpeakers: false,
      maxChannels: null,
      supportedCodecs: []
    },
    connectivity: {
      hasBluetooth: false,
      hasWiFi: false,
      hasCellular: false,
      hasUSB: false
    },
    platform: {
      os: 'unknown',
      architecture: 'unknown',
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      deviceType: 'unknown',
      vendor: 'unknown',
      model: 'unknown'
    },
    performance: {
      isLowEndDevice: false,
      canHandleLargeFiles: true,
      recommendedMaxConcurrentOperations: 3,
      recommendedMaxFileSize: 100 * 1024 * 1024 // 100MB
    }
  });

  // Check device capabilities
  const checkCapabilities = useCallback(async () => {
    const newCapabilities: DeviceCapabilities = { ...capabilities };

    // Hardware capabilities
    if ('deviceMemory' in navigator) {
      newCapabilities.deviceMemory = (navigator as any).deviceMemory;
    }

    if ('hardwareConcurrency' in navigator) {
      newCapabilities.hardwareConcurrency = navigator.hardwareConcurrency;
    }

    if ('maxTouchPoints' in navigator) {
      newCapabilities.maxTouchPoints = navigator.maxTouchPoints;
    }

    if ('pointer' in window) {
      newCapabilities.pointer = !!(window as any).PointerEvent;
    }

    // Platform detection
    const userAgent = navigator.userAgent;
    let deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown' = 'unknown';

    if (/Mobile|Android|iPhone|iPod/.test(userAgent)) {
      deviceType = 'phone';
      newCapabilities.platform.isMobile = true;
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceType = 'tablet';
      newCapabilities.platform.isTablet = true;
    } else {
      deviceType = 'desktop';
      newCapabilities.platform.isDesktop = true;
    }

    newCapabilities.platform.deviceType = deviceType;

    // OS detection
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      newCapabilities.platform.os = 'iOS';
    } else if (/Android/.test(userAgent)) {
      newCapabilities.platform.os = 'Android';
    } else if (/Windows/.test(userAgent)) {
      newCapabilities.platform.os = 'Windows';
    } else if (/Mac/.test(userAgent)) {
      newCapabilities.platform.os = 'macOS';
    } else if (/Linux/.test(userAgent)) {
      newCapabilities.platform.os = 'Linux';
    }

    // Camera capabilities
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      newCapabilities.cameras.count = videoDevices.length;

      // Check for front/back cameras
      for (const device of videoDevices) {
        const label = device.label.toLowerCase();
        if (label.includes('front') || label.includes('user')) {
          newCapabilities.cameras.hasFrontCamera = true;
        } else if (label.includes('back') || label.includes('environment')) {
          newCapabilities.cameras.hasBackCamera = true;
        }
      }

      // Try to get video capabilities
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        if (capabilities) {
          newCapabilities.cameras.maxVideoResolution = {
            width: capabilities.width?.max || 1920,
            height: capabilities.height?.max || 1080
          };
          newCapabilities.cameras.hasFlash = !!capabilities.torch;
          newCapabilities.cameras.hasAutoFocus = !!capabilities.focusMode?.includes('continuous');
        }

        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn("Could not determine camera capabilities:", error);
      }
    } catch (error) {
      console.warn("Camera enumeration failed:", error);
    }

    // Audio capabilities
    try {
      const audioDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = audioDevices.filter(device => device.kind === 'audioinput');
      const audioOutputDevices = audioDevices.filter(device => device.kind === 'audiooutput');

      newCapabilities.audio.hasMicrophone = audioInputDevices.length > 0;
      newCapabilities.audio.hasSpeakers = audioOutputDevices.length > 0;

      // Try to get audio capabilities
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();

        newCapabilities.audio.maxChannels = settings.channelCount || 2;

        // Check supported codecs (simplified)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        newCapabilities.audio.supportedCodecs = ['webm/opus', 'webm/vorbis', 'mp4/aac'];

        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn("Could not determine audio capabilities:", error);
      }
    } catch (error) {
      console.warn("Audio enumeration failed:", error);
    }

    // Storage capabilities
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        newCapabilities.storageQuota = {
          quota: estimate.quota || null,
          usage: estimate.usage || null,
          available: (estimate.quota && estimate.usage) ? estimate.quota - estimate.usage : null,
          persistent: false
        };
      }
    } catch (error) {
      console.warn("Storage estimation failed:", error);
    }

    // Connectivity capabilities
    newCapabilities.connectivity.hasBluetooth = 'bluetooth' in navigator;
    newCapabilities.connectivity.hasUSB = 'usb' in navigator;

    // WiFi and Cellular detection is limited in web APIs
    // This would typically be determined from network information
    const connection = (navigator as any).connection;
    if (connection) {
      newCapabilities.connectivity.hasWiFi = connection.type === 'wifi';
      newCapabilities.connectivity.hasCellular = ['cellular', '2g', '3g', '4g', '5g'].includes(connection.type);
    }

    // Performance characteristics
    const memoryGB = newCapabilities.deviceMemory || 4;
    const cores = newCapabilities.hardwareConcurrency || 4;

    // Determine if it's a low-end device
    newCapabilities.performance.isLowEndDevice =
      (memoryGB < 2 || cores < 4) ||
      newCapabilities.platform.isMobile && memoryGB < 4;

    // Adjust recommendations based on device capabilities
    if (newCapabilities.performance.isLowEndDevice) {
      newCapabilities.performance.canHandleLargeFiles = false;
      newCapabilities.performance.recommendedMaxConcurrentOperations = 1;
      newCapabilities.performance.recommendedMaxFileSize = 25 * 1024 * 1024; // 25MB
    } else if (newCapabilities.platform.isMobile) {
      newCapabilities.performance.recommendedMaxConcurrentOperations = 2;
      newCapabilities.performance.recommendedMaxFileSize = 50 * 1024 * 1024; // 50MB
    } else {
      newCapabilities.performance.recommendedMaxConcurrentOperations = 5;
      newCapabilities.performance.recommendedMaxFileSize = 500 * 1024 * 1024; // 500MB
    }

    setCapabilities(newCapabilities);
  }, [capabilities]);

  // Check specific capability
  const checkCapability = useCallback((capability: string): CapabilityCheckResult => {
    switch (capability) {
      case 'camera':
        return {
          supported: capabilities.cameras.count > 0,
          reason: capabilities.cameras.count === 0 ? 'No camera detected' : undefined
        };

      case 'microphone':
        return {
          supported: capabilities.audio.hasMicrophone,
          reason: capabilities.audio.hasMicrophone ? undefined : 'No microphone detected'
        };

      case 'bluetooth':
        return {
          supported: capabilities.connectivity.hasBluetooth,
          reason: capabilities.connectivity.hasBluetooth ? undefined : 'Bluetooth not supported'
        };

      case 'large-files':
        return {
          supported: capabilities.performance.canHandleLargeFiles,
          reason: capabilities.performance.canHandleLargeFiles ?
            undefined :
            'Device may have limited memory or processing power for large files',
          fallback: 'Consider processing files in smaller batches'
        };

      case 'concurrent-operations':
        return {
          supported: capabilities.performance.recommendedMaxConcurrentOperations > 1,
          reason: capabilities.performance.recommendedMaxConcurrentOperations > 1 ?
            undefined :
            'Device recommends single-file processing'
        };

      default:
        return { supported: false, reason: 'Unknown capability' };
    }
  }, [capabilities]);

  // Get device recommendations for file operations
  const getDeviceRecommendations = useCallback((operation: 'upload' | 'processing' | 'preview') => {
    const recommendations: string[] = [];

    if (capabilities.performance.isLowEndDevice) {
      recommendations.push("Consider using smaller files for better performance");
      recommendations.push("Reduce concurrent operations to avoid memory issues");
    }

    if (capabilities.platform.isMobile) {
      recommendations.push("Optimize for touch interaction and smaller screens");
      recommendations.push("Consider network conditions when uploading large files");
    }

    if (!capabilities.audio.hasMicrophone && operation === 'upload') {
      recommendations.push("Audio recording not available - use file upload instead");
    }

    if (!capabilities.cameras.count && operation === 'upload') {
      recommendations.push("Camera not available - use file upload instead");
    }

    const availableStorage = capabilities.storageQuota.available;
    if (availableStorage && availableStorage < 1024 * 1024 * 1024) { // Less than 1GB
      recommendations.push("Limited storage space available - consider clearing old files");
    }

    return recommendations;
  }, [capabilities]);

  // Initialize capabilities on mount
  useEffect(() => {
    checkCapabilities();
  }, [checkCapabilities]);

  return {
    capabilities,
    checkCapability,
    getDeviceRecommendations,

    // Convenience properties
    deviceMemory: capabilities.deviceMemory,
    hardwareConcurrency: capabilities.hardwareConcurrency,
    maxTouchPoints: capabilities.maxTouchPoints,
    hasCamera: capabilities.cameras.count > 0,
    hasMicrophone: capabilities.audio.hasMicrophone,
    hasBluetooth: capabilities.connectivity.hasBluetooth,
    hasUSB: capabilities.connectivity.hasUSB,
    deviceType: capabilities.platform.deviceType,
    isMobile: capabilities.platform.isMobile,
    isLowEndDevice: capabilities.performance.isLowEndDevice,
    canHandleLargeFiles: capabilities.performance.canHandleLargeFiles,
    recommendedMaxConcurrentOperations: capabilities.performance.recommendedMaxConcurrentOperations,
    recommendedMaxFileSize: capabilities.performance.recommendedMaxFileSize
  };
}

// Hook for monitoring device performance during operations
export function useDevicePerformance() {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    frameRate: 0,
    batteryDrainRate: 0,
    thermalThrottling: false
  });

  const [isPerformanceOptimal, setIsPerformanceOptimal] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    timestamp: number;
    cpuUsage: number;
    memoryUsage: number;
    frameRate: number;
  }>>([]);

  // Monitor performance using PerformanceObserver
  const startPerformanceMonitoring = useCallback(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            // Process performance measurements
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      return observer;
    }
    return null;
  }, []);

  // Measure current performance
  const measurePerformance = useCallback(async () => {
    const metrics = { ...performanceMetrics };

    // Estimate CPU usage using performance timing
    if ('performance' in window && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        metrics.memoryUsage = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
      }
    }

    // Measure frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        metrics.frameRate = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(measureFrameRate);
    };
    requestAnimationFrame(measureFrameRate);

    // Network latency test
    const startTime = performance.now();
    try {
      await fetch('/favicon.ico', { cache: 'no-cache' });
      metrics.networkLatency = performance.now() - startTime;
    } catch (error) {
      metrics.networkLatency = 0;
    }

    setPerformanceMetrics(metrics);

    // Add to history
    setPerformanceHistory(prev => [
      ...prev.slice(-99),
      {
        timestamp: Date.now(),
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        frameRate: metrics.frameRate
      }
    ]);

    // Determine if performance is optimal
    const optimal =
      metrics.memoryUsage < 80 &&
      metrics.frameRate > 30 &&
      metrics.networkLatency < 1000;

    setIsPerformanceOptimal(optimal);

    return metrics;
  }, [performanceMetrics]);

  // Get performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (performanceMetrics.memoryUsage > 80) {
      recommendations.push("High memory usage detected - consider processing smaller batches");
    }

    if (performanceMetrics.frameRate < 30) {
      recommendations.push("Low frame rate detected - reduce visual effects and animations");
    }

    if (performanceMetrics.networkLatency > 1000) {
      recommendations.push("High network latency detected - consider offline mode or caching");
    }

    if (performanceMetrics.thermalThrottling) {
      recommendations.push("Device may be overheating - take a break from intensive operations");
    }

    return recommendations;
  }, [performanceMetrics]);

  return {
    performanceMetrics,
    performanceHistory,
    isPerformanceOptimal,
    startPerformanceMonitoring,
    measurePerformance,
    getPerformanceRecommendations
  };
}
