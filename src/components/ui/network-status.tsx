"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Battery,
  BatteryLow,
  Zap,
  ZapOff
} from "lucide-react";
import { useNetworkMonitor, useRetryManager } from "@/lib/errors/network-interruption";
import { cn } from "@/lib/utils";
import { NetworkQuality, NetworkEventType } from "@/lib/errors/network-interruption";

// ============================================================================
// NETWORK STATUS INDICATOR COMPONENT
// ============================================================================

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  autoHide?: boolean;
  hideDelay?: number;
}

/**
 * Compact network status indicator
 */
export function NetworkStatusIndicator({
  className,
  showDetails = false,
  compact = true,
  position = "top-right",
  autoHide = true,
  hideDelay = 5000,
}: NetworkStatusIndicatorProps) {
  const { status, isOnline, isOffline, quality, refreshStatus } = useNetworkMonitor();
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide when online and stable
  useEffect(() => {
    if (autoHide && isOnline && quality !== NetworkQuality.VERY_POOR && quality !== NetworkQuality.POOR) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isOnline, quality, autoHide, hideDelay]);

  if (!isVisible && !showDetailsPanel) return null;

  const getStatusColor = () => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return "bg-green-500";
      case NetworkQuality.GOOD:
        return "bg-emerald-500";
      case NetworkQuality.FAIR:
        return "bg-yellow-500";
      case NetworkQuality.POOR:
        return "bg-orange-500";
      case NetworkQuality.VERY_POOR:
      case NetworkQuality.OFFLINE:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = () => {
    if (isOffline) {
      return <WifiOff className="h-4 w-4" />;
    }

    switch (quality) {
      case NetworkQuality.EXCELLENT:
      case NetworkQuality.GOOD:
        return <Wifi className="h-4 w-4" />;
      case NetworkQuality.FAIR:
        return <Activity className="h-4 w-4" />;
      case NetworkQuality.POOR:
      case NetworkQuality.VERY_POOR:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (isOffline) return "Offline";
    return quality.charAt(0).toUpperCase() + quality.slice(1).replace("-", " ");
  };

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <>
      <div
        className={cn(
          "fixed z-50 flex items-center gap-2 rounded-lg border bg-background/95 p-2 shadow-lg backdrop-blur",
          positionClasses[position],
          compact ? "text-xs" : "text-sm",
          className,
        )}
      >
        <div className={cn("flex items-center gap-2", getStatusColor(), "p-1 rounded")}>
          {getStatusIcon()}
        </div>

        {!compact && (
          <span className="font-medium">{getStatusText()}</span>
        )}

        {showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailsPanel(!showDetailsPanel)}
            className="h-6 px-2 text-xs"
          >
            Details
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={refreshStatus}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {showDetailsPanel && (
        <NetworkStatusPanel
          isOpen={showDetailsPanel}
          onClose={() => setShowDetailsPanel(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// NETWORK STATUS PANEL COMPONENT
// ============================================================================

interface NetworkStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Detailed network status panel
 */
function NetworkStatusPanel({ isOpen, onClose }: NetworkStatusPanelProps) {
  const { status, isOnline, quality, isSuitableFor, getRecommendations } = useNetworkMonitor();
  const { retryStates, getStatistics } = useRetryManager();
  const recommendations = getRecommendations();

  if (!isOpen) return null;

  const getQualityBadgeVariant = (quality: NetworkQuality) => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return "default";
      case NetworkQuality.GOOD:
        return "secondary";
      case NetworkQuality.FAIR:
        return "outline";
      case NetworkQuality.POOR:
        return "destructive";
      case NetworkQuality.VERY_POOR:
      case NetworkQuality.OFFLINE:
        return "destructive";
      default:
        return "outline";
    }
  };

  const getSuitabilityIcon = (suitable: boolean) => {
    return suitable ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Network Status
              </CardTitle>
              <CardDescription>
                Real-time network connectivity and performance metrics
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Connection Status</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={isOnline ? "default" : "destructive"}>
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality</span>
                  <Badge variant={getQualityBadgeVariant(quality)}>
                    {quality.replace("-", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm text-muted-foreground">
                    {status.type.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Download Speed</span>
                  <span className="text-sm text-muted-foreground">
                    {status.downlink > 0 ? `${status.downlink.toFixed(1)} Mbps` : "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Latency</span>
                  <span className="text-sm text-muted-foreground">
                    {status.rtt > 0 ? `${status.rtt} ms` : "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Saver</span>
                  <span className="text-sm text-muted-foreground">
                    {status.saveData ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            {status.isMobile && (
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  {status.batteryLevel !== undefined && (
                    <>
                      {status.batteryLevel < 0.2 ? (
                        <BatteryLow className="h-4 w-4 text-red-500" />
                      ) : (
                        <Battery className="h-4 w-4" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        Battery: {Math.round(status.batteryLevel * 100)}%
                      </span>
                    </>
                  )}
                </div>

                {status.isLowPowerMode && (
                  <div className="flex items-center gap-2">
                    <ZapOff className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      Low Power Mode
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Operation Suitability */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Operation Suitability</h3>

            <div className="space-y-2">
              {[
                { op: "upload" as const, label: "File Upload" },
                { op: "download" as const, label: "File Download" },
                { op: "streaming" as const, label: "Audio Streaming" },
                { op: "realtime" as const, label: "Real-time Features" },
              ].map(({ op, label }) => (
                <div key={op} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm font-medium">{label}</span>
                  {getSuitabilityIcon(isSuitableFor(op))}
                </div>
              ))}
            </div>
          </div>

          {/* Performance Recommendations */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Performance Recommendations</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chunk Size</span>
                  <span className="text-sm text-muted-foreground">
                    {(recommendations.chunkSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Timeout</span>
                  <span className="text-sm text-muted-foreground">
                    {(recommendations.timeout / 1000).toFixed(0)}s
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Retry Attempts</span>
                  <span className="text-sm text-muted-foreground">
                    {recommendations.retryAttempts}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compression</span>
                  <Badge variant={recommendations.compression ? "default" : "outline"}>
                    {recommendations.compression ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality</span>
                  <Badge variant="outline">
                    {recommendations.quality.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Background Sync</span>
                  <Badge variant={recommendations.backgroundSync ? "default" : "outline"}>
                    {recommendations.backgroundSync ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Retry Statistics */}
          {Object.keys(retryStates).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Retry Statistics</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Operations</span>
                    <span className="text-sm text-muted-foreground">
                      {getStatistics()?.activeRetries || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {getStatistics()?.successRate
                        ? `${(getStatistics()!.successRate * 100).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Delay</span>
                    <span className="text-sm text-muted-foreground">
                      {getStatistics()?.totalDelay
                        ? `${(getStatistics()!.totalDelay / 1000).toFixed(1)}s`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Attempts</span>
                    <span className="text-sm text-muted-foreground">
                      {getStatistics()?.averageAttempts?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// NETWORK PROGRESS COMPONENT
// ============================================================================

interface NetworkProgressProps {
  operationId: string;
  title: string;
  showRetryButton?: boolean;
  className?: string;
}

/**
 * Network operation progress indicator with retry functionality
 */
export function NetworkProgress({
  operationId,
  title,
  showRetryButton = true,
  className,
}: NetworkProgressProps) {
  const { getRetryState, resetRetry } = useRetryManager();
  const retryState = getRetryState(operationId);

  if (!retryState || retryState.attempt === 0) {
    return null;
  }

  const progressPercentage = (retryState.attempt / retryState.maxAttempts) * 100;
  const isRetrying = retryState.isRetrying;
  const canRetry = retryState.canRetry && !isRetrying;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{title}</h4>
          <div className="flex items-center gap-2">
            {isRetrying && <RefreshCw className="h-4 w-4 animate-spin" />}
            <Badge variant={isRetrying ? "default" : canRetry ? "outline" : "destructive"}>
              {isRetrying
                ? `Retrying (${retryState.attempt}/${retryState.maxAttempts})`
                : canRetry
                  ? "Can Retry"
                  : "Failed"
              }
            </Badge>
          </div>
        </div>

        <Progress value={progressPercentage} className="mb-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Attempt {retryState.attempt} of {retryState.maxAttempts}
          </span>
          {retryState.nextRetryTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next retry: {Math.ceil((retryState.nextRetryTime.getTime() - Date.now()) / 1000)}s
            </span>
          )}
        </div>

        {showRetryButton && canRetry && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetRetry(operationId)}
              className="w-full"
            >
              Retry Now
            </Button>
          </div>
        )}

        {retryState.lastError && (
          <div className="mt-2 text-xs text-destructive">
            Error: {retryState.lastError?.message || "Unknown error"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// OFFLINE MODE BANNER
// ============================================================================

interface OfflineModeBannerProps {
  className?: string;
  showRetryCount?: boolean;
  onRetryAll?: () => void;
}

/**
 * Banner shown when application is in offline mode
 */
export function OfflineModeBanner({
  className,
  showRetryCount = true,
  onRetryAll,
}: OfflineModeBannerProps) {
  const { isOnline, isOffline } = useNetworkMonitor();
  const { retryStates, getStatistics } = useRetryManager();

  const pendingCount = Object.keys(retryStates).filter(id =>
    retryStates[id].canRetry && !retryStates[id].isRetrying
  ).length;

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className={cn(
      "w-full border-l-4 border-orange-500 bg-orange-50 p-4",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-orange-600" />
          <div>
            <h3 className="text-sm font-medium text-orange-800">
              {isOffline ? "You're offline" : "Connection issues detected"}
            </h3>
            <p className="text-sm text-orange-700">
              {isOffline
                ? "Some features may be unavailable until you reconnect."
                : "Some operations failed and will retry automatically."
              }
              {showRetryCount && pendingCount > 0 && (
                <span> {pendingCount} pending operation{pendingCount !== 1 ? 's' : ''}.</span>
              )}
            </p>
          </div>
        </div>

        {onRetryAll && pendingCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            className="shrink-0"
          >
            Retry All
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// NETWORK QUALITY INDICATOR
// ============================================================================

interface NetworkQualityIndicatorProps {
  quality: NetworkQuality;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Simple network quality indicator
 */
export function NetworkQualityIndicator({
  quality,
  size = "md",
  showLabel = true,
  className,
}: NetworkQualityIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const getQualityColor = (quality: NetworkQuality) => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return "bg-green-500";
      case NetworkQuality.GOOD:
        return "bg-emerald-500";
      case NetworkQuality.FAIR:
        return "bg-yellow-500";
      case NetworkQuality.POOR:
        return "bg-orange-500";
      case NetworkQuality.VERY_POOR:
      case NetworkQuality.OFFLINE:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getQualityLabel = (quality: NetworkQuality) => {
    return quality.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-full",
        sizeClasses[size],
        getQualityColor(quality)
      )} />
      {showLabel && (
        <span className="text-sm font-medium">
          {getQualityLabel(quality)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// RETRY STATUS COMPONENT
// ============================================================================

interface RetryStatusProps {
  operationId: string;
  showProgress?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Component to display retry status for a specific operation
 */
export function RetryStatus({
  operationId,
  showProgress = true,
  showDetails = false,
  className,
}: RetryStatusProps) {
  const { getRetryState, resetRetry, cancelRetry } = useRetryManager();
  const retryState = getRetryState(operationId);

  if (!retryState || retryState.attempt === 0) {
    return null;
  }

  const progressPercentage = (retryState.attempt / retryState.maxAttempts) * 100;
  const isRetrying = retryState.isRetrying;
  const canRetry = retryState.canRetry && !isRetrying;
  const isExhausted = retryState.attempt >= retryState.maxAttempts;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {isRetrying ? "Retrying..." : isExhausted ? "Retry Exhausted" : "Ready to Retry"}
        </span>
        <Badge variant={
          isRetrying ? "default" :
          isExhausted ? "destructive" :
          canRetry ? "outline" : "secondary"
        }>
          {retryState.attempt}/{retryState.maxAttempts}
        </Badge>
      </div>

      {showProgress && (
        <Progress
          value={progressPercentage}
          className={cn(
            "h-2",
            isExhausted && "opacity-50"
          )}
        />
      )}

      {showDetails && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            Total delay: {(retryState.totalDelay / 1000).toFixed(1)}s
          </div>
          {retryState.nextRetryTime && !isRetrying && canRetry && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next retry: {Math.ceil((retryState.nextRetryTime.getTime() - Date.now()) / 1000)}s
            </div>
          )}
          {retryState.lastError && (
            <div className="text-destructive">
              Last error: {retryState.lastError?.message || "Unknown error"}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetRetry(operationId)}
            className="flex-1"
          >
            Retry Now
          </Button>
        )}
        {isRetrying && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cancelRetry(operationId)}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default NetworkStatusIndicator;
