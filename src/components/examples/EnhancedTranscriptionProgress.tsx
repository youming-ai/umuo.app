"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  useFileStatusManager,
  useTranscriptionWithProgress,
  usePlayerDataQuery
} from "@/hooks";
import { useDeviceInfo } from "@/hooks/useRobustProgressTracker";
import type { DeviceInfo } from "@/types/mobile";

/**
 * Enhanced Transcription Progress Component
 *
 * This component demonstrates how to use the enhanced progress tracking system
 * for transcription jobs with fallback tiers, sync management, and device optimization.
 */
interface EnhancedTranscriptionProgressProps {
  fileId: number;
  fileName?: string;
}

export function EnhancedTranscriptionProgress({
  fileId,
  fileName
}: EnhancedTranscriptionProgressProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { deviceInfo } = useDeviceInfo();

  // Enhanced file status manager with progress tracking
  const {
    updateFileStatus,
    startTranscription,
    resetFileStatus,
    isUpdating,
    isTranscribing,
    enhancedProgress,
    currentJobId,
    hasEnhancedProgress,
    stopEnhancedProgress,
    forceFallback,
    refetchProgress,
  } = useFileStatusManager(fileId, {
    enableEnhancedProgress: true,
    fallbackConfig: {
      maxTierTransitions: 5,
      tierTransitionCooldown: 10000,
      healthCheckTimeout: 30000,
      enableMobileOptimizations: true,
    },
    progressSyncConfig: {
      conflictResolution: "smart",
      enableOfflineSupport: true,
      syncInterval: 1000,
      throttleMs: 200,
    },
  });

  // Direct enhanced transcription hook
  const enhancedTranscription = useTranscriptionWithProgress();

  const handleStartTranscription = async () => {
    try {
      await startTranscription();
    } catch (error) {
      console.error("Failed to start transcription:", error);
    }
  };

  const handleForceFallback = async () => {
    if (forceFallback) {
      await forceFallback();
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "synced": return "bg-green-500";
      case "syncing": return "bg-blue-500";
      case "conflict": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getConnectionStatusText = (status: string) => {
    switch (status) {
      case "synced": return "已同步";
      case "syncing": return "同步中";
      case "conflict": return "冲突";
      case "offline": return "离线";
      case "error": return "错误";
      default: return status;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>增强转录进度跟踪</span>
          <div className="flex gap-2">
            {hasEnhancedProgress && (
              <Badge variant="secondary" className="text-green-600">
                增强进度
              </Badge>
            )}
            {deviceInfo && (
              <Badge variant="outline">
                {deviceInfo.type === "mobile" ? "移动设备" :
                 deviceInfo.type === "tablet" ? "平板" : "桌面设备"}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Information */}
        <div className="flex justify-between items-center">
          <span className="font-medium">文件:</span>
          <span className="text-sm text-gray-600">{fileName || `ID: ${fileId}`}</span>
        </div>

        {/* Basic Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">转录进度:</span>
            <span className="text-sm text-gray-600">
              {enhancedProgress?.progress
                ? `${Math.round(enhancedProgress.progress.overallProgress)}%`
                : isTranscribing
                  ? "转录中..."
                  : "未开始"}
            </span>
          </div>
          <Progress
            value={enhancedProgress?.progress?.overallProgress || 0}
            className="w-full"
          />
        </div>

        {/* Connection Status */}
        {hasEnhancedProgress && enhancedProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">连接状态:</span>
              <Badge
                variant="outline"
                className={`${getConnectionStatusColor(enhancedProgress.syncStatus)} text-white`}
              >
                {getConnectionStatusText(enhancedProgress.syncStatus)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">当前层级:</span>
              <span className="text-sm">{enhancedProgress.currentTier}</span>
            </div>
          </div>
        )}

        {/* Stage Progress */}
        {enhancedProgress?.progress?.stageProgress && (
          <div className="space-y-2">
            <span className="font-medium">阶段进度:</span>
            {Object.entries(enhancedProgress.progress.stageProgress).map(([stage, data]) => (
              <div key={stage} className="ml-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm capitalize">{stage}:</span>
                  <span className="text-xs text-gray-600">{Math.round(data.progress)}%</span>
                </div>
                <Progress value={data.progress} className="w-full h-2" />
              </div>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleStartTranscription}
            disabled={isTranscribing || isUpdating}
            className="flex-1"
          >
            {isTranscribing ? "转录中..." : "开始转录"}
          </Button>

          {hasEnhancedProgress && (
            <>
              <Button
                variant="outline"
                onClick={handleForceFallback}
                disabled={!forceFallback || !isTranscribing}
              >
                强制降级
              </Button>
              <Button
                variant="outline"
                onClick={refetchProgress}
                disabled={!refetchProgress}
              >
                刷新进度
              </Button>
              <Button
                variant="outline"
                onClick={stopEnhancedProgress}
                disabled={!stopEnhancedProgress || !isTranscribing}
              >
                停止跟踪
              </Button>
            </>
          )}

          <Button
            variant="outline"
            onClick={resetFileStatus}
            disabled={isUpdating}
          >
            重置状态
          </Button>
        </div>

        {/* Advanced Information */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            高级信息
            <span className="text-xs">{showAdvanced ? "收起" : "展开"}</span>
          </Button>

          {showAdvanced && enhancedProgress && (
            <div className="mt-4 space-y-3 text-sm">
              {currentJobId && (
                <div className="flex justify-between">
                  <span className="font-medium">任务ID:</span>
                  <span className="font-mono text-xs">{currentJobId}</span>
                </div>
              )}

              {deviceInfo && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">设备类型:</span> {deviceInfo.type}
                  </div>
                  <div>
                    <span className="font-medium">网络:</span> {deviceInfo.networkType}
                  </div>
                  {deviceInfo.batteryLevel !== undefined && (
                    <div>
                      <span className="font-medium">电量:</span> {Math.round(deviceInfo.batteryLevel * 100)}%
                    </div>
                  )}
                  {deviceInfo.isLowPowerMode !== undefined && (
                    <div>
                      <span className="font-medium">省电模式:</span> {deviceInfo.isLowPowerMode ? "是" : "否"}
                    </div>
                  )}
                </div>
              )}

              {enhancedProgress.healthMetrics && (
                <div className="space-y-1">
                  <div className="font-medium">连接健康度:</div>
                  <div className="ml-4 grid grid-cols-2 gap-2 text-xs">
                    <div>分数: {enhancedProgress.healthMetrics.score}</div>
                    <div>连续失败: {enhancedProgress.healthMetrics.consecutiveFailures}</div>
                    <div>错误率: {enhancedProgress.healthMetrics.errorRate}%</div>
                    <div>运行时间: {enhancedProgress.healthMetrics.uptime}ms</div>
                  </div>
                </div>
              )}

              {enhancedProgress.conflicts && enhancedProgress.conflicts.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium text-yellow-600">检测到冲突:</div>
                  <div className="ml-4 text-xs">
                    {enhancedProgress.conflicts.map((conflict, index) => (
                      <div key={index} className="mb-1">
                        源: {conflict.source}, 进度: {Math.round(conflict.progress.overallProgress)}%
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enhancedProgress.fallbackHistory && enhancedProgress.fallbackHistory.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium">降级历史:</div>
                  <div className="ml-4 text-xs">
                    {enhancedProgress.fallbackHistory.map((transition, index) => (
                      <div key={index} className="mb-1">
                        {transition.fromTier} → {transition.toTier} ({transition.reason})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example usage in a player component with enhanced progress tracking
 */
export function EnhancedPlayerExample({ fileId }: { fileId: string }) {
  const {
    file,
    segments,
    transcript,
    audioUrl,
    loading,
    error,
    retry,
    isTranscribing,
    transcriptionProgress,
    enhancedProgress,
    currentJobId,
    hasEnhancedProgress,
  } = usePlayerDataQuery(fileId, {
    enableEnhancedProgress: true,
    fallbackConfig: {
      maxTierTransitions: 3,
      tierTransitionCooldown: 15000,
      healthCheckTimeout: 25000,
      enableMobileOptimizations: true,
    },
    progressSyncConfig: {
      conflictResolution: "smart",
      enableOfflineSupport: true,
      syncInterval: 1500,
      throttleMs: 300,
    },
  });

  return (
    <div className="space-y-4">
      {/* Standard player UI */}
      <div className="p-4 border rounded">
        <h3 className="font-medium mb-2">播放器界面</h3>
        {file && (
          <div className="text-sm">
            文件: {file.name} |
            状态: {isTranscribing ? "转录中" : transcript ? "已完成" : "未转录"}
          </div>
        )}

        {hasEnhancedProgress && currentJobId && (
          <EnhancedTranscriptionProgress
            fileId={parseInt(fileId)}
            fileName={file?.name}
          />
        )}
      </div>

      {/* Enhanced Progress Information */}
      {hasEnhancedProgress && enhancedProgress && (
        <div className="p-4 border rounded bg-gray-50">
          <h4 className="font-medium mb-2">增强进度信息</h4>
          <div className="text-sm space-y-1">
            <div>连接层级: {enhancedProgress.currentTier}</div>
            <div>同步状态: {enhancedProgress.syncStatus}</div>
            {enhancedProgress.progress && (
              <div>
                当前阶段: {enhancedProgress.progress.currentStage} |
                总体进度: {Math.round(enhancedProgress.progress.overallProgress)}%
              </div>
            )}
            {enhancedProgress.healthMetrics && (
              <div>
                健康分数: {enhancedProgress.healthMetrics.score} |
                错误率: {enhancedProgress.healthMetrics.errorRate}%
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
