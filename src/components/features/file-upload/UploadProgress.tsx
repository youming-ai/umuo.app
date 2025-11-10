"use client";

import React, { useEffect, useState } from "react";
import {
  Pause,
  Play,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { useHapticFeedback } from "./hooks/useMobileFileUpload";
import { formatFileSize } from "./FileValidation";

interface UploadProgressProps {
  progress: {
    loaded: number;
    total: number;
    percentage: number;
    stage: "preparing" | "uploading" | "processing" | "completed" | "error";
    fileId?: number;
  } | null;
  isUploading: boolean;
  error?: Error | null;
  canRetry?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
  mobileOptimized?: boolean;
}

interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
}

export default function UploadProgress({
  progress,
  isUploading,
  error,
  canRetry = false,
  onPause,
  onResume,
  onCancel,
  onRetry,
  className = "",
  showDetails = true,
  mobileOptimized = true,
}: UploadProgressProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    number | null
  >(null);
  const [uploadStartTime] = useState(Date.now());
  const { triggerHaptic } = useHapticFeedback();

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
      });
    };

    updateNetworkStatus();

    const handleOnline = () => {
      updateNetworkStatus();
      if (isPaused && navigator.onLine) {
        triggerHaptic("success");
        handleResume();
      }
    };

    const handleOffline = () => {
      updateNetworkStatus();
      triggerHaptic("error");
      setIsPaused(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isPaused, triggerHaptic]);

  // Calculate estimated time remaining
  useEffect(() => {
    if (progress && progress.stage === "uploading" && progress.percentage > 0) {
      const elapsed = Date.now() - uploadStartTime;
      const estimatedTotal = (elapsed / progress.percentage) * 100;
      const remaining = estimatedTotal - elapsed;

      // Only update if we have reasonable data
      if (remaining > 0 && remaining < 3600000) {
        // Less than 1 hour
        setEstimatedTimeRemaining(remaining);
      }
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [progress, uploadStartTime]);

  const handlePause = () => {
    setIsPaused(true);
    triggerHaptic("light");
    onPause?.();
  };

  const handleResume = () => {
    setIsPaused(false);
    triggerHaptic("light");
    onResume?.();
  };

  const handleCancel = () => {
    triggerHaptic("medium");
    onCancel?.();
  };

  const handleRetry = () => {
    setIsPaused(false);
    triggerHaptic("medium");
    onRetry?.();
  };

  // Get stage-specific configuration
  const getStageConfig = () => {
    switch (progress?.stage) {
      case "preparing":
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          message: "Preparing upload...",
        };
      case "uploading":
        return {
          icon: isPaused ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin" />
          ),
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          message: isPaused ? "Upload paused" : "Uploading...",
        };
      case "processing":
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          color: "text-orange-500",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          message: "Processing file...",
        };
      case "completed":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          message: "Upload completed!",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          message: error?.message || "Upload failed",
        };
      default:
        return {
          icon: <Loader2 className="w-5 h-5" />,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          message: "Initializing...",
        };
    }
  };

  const stageConfig = getStageConfig();

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  };

  if (!progress && !isUploading && !error) {
    return null;
  }

  return (
    <div
      className={`upload-progress ${mobileOptimized ? "mobile-optimized" : ""} ${className}`}
    >
      <div
        className={`rounded-lg border p-4 ${stageConfig.bgColor} ${stageConfig.borderColor}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={stageConfig.color}>{stageConfig.icon}</div>
            <span className={`font-medium text-sm ${stageConfig.color}`}>
              {stageConfig.message}
            </span>
          </div>

          {/* Network status indicator */}
          <div className="flex items-center gap-2">
            {networkStatus.isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}

            {/* Action buttons */}
            {progress?.stage === "uploading" && !progress.error && (
              <div className="flex gap-1">
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="p-1 rounded-full hover:bg-black/10 transition-colors"
                    aria-label="Resume upload"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="p-1 rounded-full hover:bg-black/10 transition-colors"
                    aria-label="Pause upload"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleCancel}
                  className="p-1 rounded-full hover:bg-black/10 transition-colors"
                  aria-label="Cancel upload"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {(progress?.stage === "error" || error) && canRetry && (
              <button
                onClick={handleRetry}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                aria-label="Retry upload"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress &&
          (progress.stage === "uploading" ||
            progress.stage === "processing") && (
            <div className="space-y-2">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-white animate-pulse" />
                </div>
              </div>

              {showDetails && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{formatFileSize(progress.loaded)}</span>
                  <span>{formatFileSize(progress.total)}</span>
                  <span>{Math.round(progress.percentage)}%</span>
                </div>
              )}
            </div>
          )}

        {/* Additional details */}
        {showDetails && (
          <div className="mt-3 space-y-2 text-xs text-gray-600">
            {/* Time remaining */}
            {estimatedTimeRemaining &&
              progress?.stage === "uploading" &&
              !isPaused && (
                <div className="flex items-center gap-1">
                  <span>
                    Time remaining:{" "}
                    {formatTimeRemaining(estimatedTimeRemaining)}
                  </span>
                </div>
              )}

            {/* Network info */}
            {networkStatus.effectiveType && (
              <div className="flex items-center gap-1">
                <span>Connection: {networkStatus.effectiveType}</span>
              </div>
            )}

            {/* Offline warning */}
            {!networkStatus.isOnline && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="w-3 h-3" />
                <span>
                  Offline - upload will resume when connection is restored
                </span>
              </div>
            )}

            {/* Paused indicator */}
            {isPaused && (
              <div className="flex items-center gap-1 text-orange-600">
                <Pause className="w-3 h-3" />
                <span>Upload paused</span>
              </div>
            )}
          </div>
        )}

        {/* Error details */}
        {(progress?.stage === "error" || error) && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded text-xs text-red-700">
            <strong>Error:</strong> {stageConfig.message}
            {canRetry && (
              <button
                onClick={handleRetry}
                className="block mt-2 text-blue-600 underline"
              >
                Tap to retry
              </button>
            )}
          </div>
        )}

        {/* Success message */}
        {progress?.stage === "completed" && (
          <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded text-xs text-green-700">
            <strong>Success!</strong> File uploaded successfully.
          </div>
        )}
      </div>

      {/* Mobile-optimized styles */}
      <style jsx>{`
        .upload-progress.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }

        @media (max-width: 768px) {
          .upload-progress {
            padding: 0.5rem;
          }

          .upload-progress button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
