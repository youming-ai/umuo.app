import { useCallback, useState, useEffect } from "react";
import { SimplePerformanceService } from "@/lib/monitoring/simple-performance.service";

export interface UseSimplePerformanceMonitorReturn {
  recordMetric: (name: string, value: number, category?: string) => void;
  recordApiCall: (name: string, duration: number, success?: boolean) => void;
  recordTranscription: (
    fileId: number,
    duration: number,
    success?: boolean,
  ) => void;
  recordUserInteraction: (action: string, duration: number) => void;
  getMetrics: () => any[];
  getAverageMetric: (name: string) => number;
  clearMetrics: () => void;
  isMonitoring: boolean;
  setMonitoring: (enabled: boolean) => void;
  totalMetrics: number;
  averageApiTime: number;
}

export function useSimplePerformanceMonitor(): UseSimplePerformanceMonitorReturn {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [performanceService] = useState(() => new SimplePerformanceService());
  const [totalMetrics, setTotalMetrics] = useState(0);

  useEffect(() => {
    setTotalMetrics(performanceService.getMetrics().length);
  }, [performanceService]);

  const recordMetric = useCallback(
    (name: string, value: number, category?: string) => {
      if (!isMonitoring) return;

      performanceService.recordMetric(name, value, { category });
      setTotalMetrics(performanceService.getMetrics().length);
    },
    [isMonitoring, performanceService],
  );

  const recordApiCall = useCallback(
    (name: string, duration: number, success = true) => {
      if (!isMonitoring) return;

      performanceService.recordMetric(`api_${name}`, duration, {
        type: "api",
        success,
      });
      setTotalMetrics(performanceService.getMetrics().length);
    },
    [isMonitoring, performanceService],
  );

  const recordTranscription = useCallback(
    (fileId: number, duration: number, success = true) => {
      if (!isMonitoring) return;

      performanceService.recordMetric("transcription", duration, {
        fileId,
        success,
        type: "transcription",
      });
      setTotalMetrics(performanceService.getMetrics().length);
    },
    [isMonitoring, performanceService],
  );

  const recordUserInteraction = useCallback(
    (action: string, duration: number) => {
      if (!isMonitoring) return;

      performanceService.recordMetric(`user_${action}`, duration, {
        type: "user_interaction",
      });
      setTotalMetrics(performanceService.getMetrics().length);
    },
    [isMonitoring, performanceService],
  );

  const getMetrics = useCallback(() => {
    return performanceService.getMetrics();
  }, [performanceService]);

  const getAverageMetric = useCallback(
    (name: string) => {
      return performanceService.getAverageTime(name);
    },
    [performanceService],
  );

  const clearMetrics = useCallback(() => {
    performanceService.clearMetrics();
    setTotalMetrics(0);
  }, [performanceService]);

  const setMonitoring = useCallback((enabled: boolean) => {
    setIsMonitoring(enabled);
  }, []);

  // 计算一些有用的统计
  const averageApiTime = getAverageMetric("api_transcribe");

  return {
    recordMetric,
    recordApiCall,
    recordTranscription,
    recordUserInteraction,
    getMetrics,
    getAverageMetric,
    clearMetrics,
    isMonitoring,
    setMonitoring,
    totalMetrics,
    averageApiTime,
  };
}
