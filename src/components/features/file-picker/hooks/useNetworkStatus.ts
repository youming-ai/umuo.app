"use client";

import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  online: boolean;
  offline: boolean;
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  since?: Date;
}

interface NetworkQuality {
  quality: "excellent" | "good" | "fair" | "poor" | "very-poor";
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  stability: "stable" | "unstable" | "very-unstable";
}

interface NetworkMetrics {
  timestamp: number;
  downlink: number;
  rtt: number;
  effectiveType: string;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    offline: !navigator.onLine,
    type: "unknown",
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  const [quality, setQuality] = useState<NetworkQuality>({
    quality: "fair",
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    stability: "stable",
  });

  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);
  const [isStable, setIsStable] = useState(true);
  const metricsRef = useRef<NetworkMetrics[]>([]);

  // Update network status
  const updateNetworkStatus = useCallback(() => {
    const newStatus: NetworkStatus = {
      online: navigator.onLine,
      offline: !navigator.onLine,
      type: "unknown",
      effectiveType: "unknown",
      downlink: 0,
      rtt: 0,
      saveData: false,
    };

    // Get detailed network information if available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      newStatus.type = connection.type || "unknown";
      newStatus.effectiveType = connection.effectiveType || "unknown";
      newStatus.downlink = connection.downlink || 0;
      newStatus.rtt = connection.rtt || 0;
      newStatus.saveData = connection.saveData || false;
    }

    setStatus(newStatus);
    setIsStable(navigator.onLine);

    // Track metrics
    const metric: NetworkMetrics = {
      timestamp: Date.now(),
      downlink: newStatus.downlink,
      rtt: newStatus.rtt,
      effectiveType: newStatus.effectiveType,
    };

    metricsRef.current.push(metric);

    // Keep only last 100 metrics
    if (metricsRef.current.length > 100) {
      metricsRef.current = metricsRef.current.slice(-100);
    }

    setMetrics([...metricsRef.current]);

    // Update quality assessment
    updateNetworkQuality(newStatus);
  }, []);

  // Update network quality assessment
  const updateNetworkQuality = useCallback((status: NetworkStatus) => {
    let qualityScore = 0;

    // Assess quality based on effective type
    switch (status.effectiveType) {
      case "4g":
        qualityScore += 80;
        break;
      case "3g":
        qualityScore += 60;
        break;
      case "2g":
        qualityScore += 30;
        break;
      case "slow-2g":
        qualityScore += 10;
        break;
      default:
        qualityScore += 50; // Unknown connection
    }

    // Adjust based on actual downlink speed
    if (status.downlink > 10) {
      qualityScore += 20; // Fast connection
    } else if (status.downlink < 1) {
      qualityScore -= 20; // Slow connection
    }

    // Adjust based on latency
    if (status.rtt < 100) {
      qualityScore += 10; // Low latency
    } else if (status.rtt > 500) {
      qualityScore -= 20; // High latency
    }

    // Adjust based on save data mode
    if (status.saveData) {
      qualityScore -= 30; // Data saver mode
    }

    // Determine quality category
    let networkQuality: NetworkQuality["quality"];
    if (qualityScore >= 90) networkQuality = "excellent";
    else if (qualityScore >= 70) networkQuality = "good";
    else if (qualityScore >= 50) networkQuality = "fair";
    else if (qualityScore >= 30) networkQuality = "poor";
    else networkQuality = "very-poor";

    // Calculate stability
    const recentMetrics = metricsRef.current.slice(-10);
    const stability = calculateStability(recentMetrics);

    setQuality({
      quality: networkQuality,
      downloadSpeed: status.downlink,
      uploadSpeed: status.downlink * 0.8, // Estimate upload as 80% of download
      latency: status.rtt,
      stability,
    });
  }, []);

  // Calculate network stability
  const calculateStability = useCallback(
    (metrics: NetworkMetrics[]): NetworkQuality["stability"] => {
      if (metrics.length < 5) return "stable";

      const downlinks = metrics.map((m) => m.downlink);
      const avgDownlink =
        downlinks.reduce((sum, d) => sum + d, 0) / downlinks.length;
      const variance =
        downlinks.reduce((sum, d) => sum + Math.pow(d - avgDownlink, 2), 0) /
        downlinks.length;
      const stdDev = Math.sqrt(variance);

      const coefficient = stdDev / avgDownlink;

      if (coefficient < 0.1) return "stable";
      if (coefficient < 0.3) return "unstable";
      return "very-unstable";
    },
    [],
  );

  // Test network speed
  const testNetworkSpeed = useCallback(async (): Promise<{
    download: number;
    upload: number;
  }> => {
    if (!status.online) {
      throw new Error("Cannot test speed while offline");
    }

    try {
      // Simple download test - download a small file
      const downloadStartTime = Date.now();
      const response = await fetch("https://httpbin.org/bytes/102400", {
        // 100KB test file
        cache: "no-store",
      });
      const downloadBlob = await response.blob();
      const downloadEndTime = Date.now();

      const downloadTime = (downloadEndTime - downloadStartTime) / 1000; // seconds
      const downloadSize = downloadBlob.size * 8; // bits
      const downloadSpeed = downloadSize / downloadTime / 1000000; // Mbps

      // Simple upload test - upload small data
      const uploadStartTime = Date.now();
      const uploadData = new ArrayBuffer(10240); // 10KB test data
      await fetch("https://httpbin.org/post", {
        method: "POST",
        body: uploadData,
        cache: "no-store",
      });
      const uploadEndTime = Date.now();

      const uploadTime = (uploadEndTime - uploadStartTime) / 1000; // seconds
      const uploadSize = uploadData.byteLength * 8; // bits
      const uploadSpeed = uploadSize / uploadTime / 1000000; // Mbps

      return { download: downloadSpeed, upload: uploadSpeed };
    } catch (error) {
      console.error("Network speed test failed:", error);
      throw error;
    }
  }, [status.online]);

  // Get recommended upload settings based on network
  const getUploadRecommendations = useCallback(() => {
    const recommendations = {
      chunkSize: 1024 * 1024, // 1MB default
      concurrentUploads: 3,
      retryAttempts: 3,
      timeout: 30000, // 30 seconds
      compression: false,
      quality: "medium" as "low" | "medium" | "high",
    };

    // Adjust based on connection quality
    switch (status.effectiveType) {
      case "slow-2g":
        recommendations.chunkSize = 256 * 1024; // 256KB
        recommendations.concurrentUploads = 1;
        recommendations.retryAttempts = 5;
        recommendations.timeout = 60000; // 1 minute
        recommendations.compression = true;
        recommendations.quality = "low";
        break;

      case "2g":
        recommendations.chunkSize = 512 * 1024; // 512KB
        recommendations.concurrentUploads = 2;
        recommendations.retryAttempts = 4;
        recommendations.timeout = 45000; // 45 seconds
        recommendations.compression = true;
        recommendations.quality = "low";
        break;

      case "3g":
        recommendations.chunkSize = 1024 * 1024; // 1MB
        recommendations.concurrentUploads = 3;
        recommendations.retryAttempts = 3;
        recommendations.timeout = 30000; // 30 seconds
        recommendations.compression = false;
        recommendations.quality = "medium";
        break;

      case "4g":
        recommendations.chunkSize = 2 * 1024 * 1024; // 2MB
        recommendations.concurrentUploads = 4;
        recommendations.retryAttempts = 2;
        recommendations.timeout = 20000; // 20 seconds
        recommendations.compression = false;
        recommendations.quality = "high";
        break;
    }

    // Adjust based on save data mode
    if (status.saveData) {
      recommendations.chunkSize = Math.min(
        recommendations.chunkSize,
        256 * 1024,
      );
      recommendations.compression = true;
      recommendations.quality = "low";
    }

    return recommendations;
  }, [status]);

  // Estimate upload time for file
  const estimateUploadTime = useCallback(
    (fileSize: number): number => {
      const uploadSpeed = quality.uploadSpeed * 1000000; // Convert to bits per second
      const sizeInBits = fileSize * 8;
      return sizeInBits / uploadSpeed; // Return seconds
    },
    [quality.uploadSpeed],
  );

  // Check if network conditions are suitable for operation
  const isNetworkSuitable = useCallback(
    (operation: "upload" | "download" | "streaming" | "realtime"): boolean => {
      switch (operation) {
        case "upload":
          return (
            status.online &&
            status.downlink > 0.5 &&
            quality.stability !== "very-unstable"
          );
        case "download":
          return status.online && status.downlink > 0.2;
        case "streaming":
          return (
            status.online &&
            status.downlink > 2 &&
            quality.stability !== "very-unstable"
          );
        case "realtime":
          return (
            status.online && status.rtt < 200 && quality.stability === "stable"
          );
        default:
          return status.online;
      }
    },
    [status, quality],
  );

  // Set up event listeners
  useEffect(() => {
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes if available
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const handleChange = () => updateNetworkStatus();

      connection.addEventListener("change", handleChange);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", handleChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [updateNetworkStatus]);

  // Initial status update
  useEffect(() => {
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  // Set up periodic quality checks
  useEffect(() => {
    const interval = setInterval(() => {
      updateNetworkStatus();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [updateNetworkStatus]);

  return {
    // Basic status
    isOnline: status.online,
    isOffline: status.offline,
    connectionType: status.type,
    effectiveType: status.effectiveType,
    downlink: status.downlink,
    rtt: status.rtt,
    saveData: status.saveData,

    // Quality assessment
    quality,
    isStable,
    metrics,

    // Methods
    testNetworkSpeed,
    getUploadRecommendations,
    estimateUploadTime,
    isNetworkSuitable,
    refreshStatus: updateNetworkStatus,
  };
}
