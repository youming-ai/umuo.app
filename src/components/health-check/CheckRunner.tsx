'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  Square,
  X,
  Zap,
  Shield,
  Monitor,
  Database,
  Activity
} from 'lucide-react';
import { CheckStatus, CheckCategory } from '@/lib/health-check/types';

interface CheckRunnerProps {
  isRunning: boolean;
  progress: {
    total: number;
    completed: number;
    currentCategory: string;
    percentage: number;
  };
  estimatedTimeRemaining: number;
  currentCheckId: string | null;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  onResume: () => void;
  className?: string;
}

export function CheckRunner({
  isRunning,
  progress,
  estimatedTimeRemaining,
  currentCheckId,
  onStart,
  onPause,
  onCancel,
  onResume,
  className
}: CheckRunnerProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case CheckStatus.PASSED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case CheckStatus.FAILED:
        return <X className="h-5 w-5 text-red-500" />;
      case CheckStatus.WARNING:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case CheckStatus.RUNNING:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'api_connectivity': <Zap className="h-4 w-4" />,
      'error_handling': <Shield className="h-4 w-4" />,
      'performance': <Activity className="h-4 w-4" />,
      'user_experience': <Monitor className="h-4 w-4" />,
      'security': <Shield className="h-4 w-4" />,
      'offline_capability': <Database className="h-4 w-4" />,
    };
    return iconMap[category] || <Activity className="h-4 w-4" />;
  };

  const getStatusColor = (status: CheckStatus) => {
    switch (status) {
      case CheckStatus.PASSED:
        return 'bg-green-50 text-green-700 border-green-200';
      case CheckStatus.FAILED:
        return 'bg-red-50 text-red-700 border-red-200';
      case CheckStatus.WARNING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case CheckStatus.RUNNING:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Health Check Runner</CardTitle>
            <CardDescription>
              {isRunning ? 'Check in progress...' : 'Ready to start health check'}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {!isRunning && !currentCheckId && (
              <Button onClick={onStart} className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Start Check</span>
              </Button>
            )}
            {isRunning && (
              <Button onClick={onPause} variant="outline" className="flex items-center space-x-2">
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
            )}
            {!isRunning && currentCheckId && (
              <Button onClick={onResume} variant="outline" className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </Button>
            )}
            {(isRunning || currentCheckId) && (
              <Button onClick={onCancel} variant="destructive" className="flex items-center space-x-2">
                <Square className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 进度概览 */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">
                {progress.completed}/{progress.total} ({progress.percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
          </div>

          {/* 当前检查状态 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className={`h-6 w-6 ${isRunning ? 'animate-spin' : ''}`} />
              <div>
                <div className="font-medium">{progress.currentCategory}</div>
                <div className="text-sm text-gray-600">
                  Currently checking...
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Estimated time</div>
              <div className="font-medium">{formatTime(estimatedTimeRemaining)}</div>
            </div>
          </div>

          {/* 检查详情标签页 */}
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Running {progress.currentCategory}...</p>
                <p className="text-sm mt-2">
                  {formatTime(estimatedTimeRemaining)} remaining
                </p>
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-2">
              {progress.completed === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No checks completed yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Array.from({ length: progress.completed }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">
                          Check {index + 1}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Completed
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Check ID</div>
                  <div className="text-gray-600 font-mono text-xs">
                    {currentCheckId || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Total Checks</div>
                  <div className="text-gray-600">{progress.total}</div>
                </div>
                <div>
                  <div className="font-medium">Progress</div>
                  <div className="text-gray-600">{progress.percentage.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="font-medium">Time Elapsed</div>
                  <div className="text-gray-600">
                    {formatTime((progress.percentage / 100) * (5 * 60 * 1000))}
                  </div>
                </div>
              </div>

              {/* 检查类别说明 */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Check Categories</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>API Connectivity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Error Handling</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <span>Performance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4 text-purple-500" />
                    <span>User Experience</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    <span>Security</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span>Offline Capability</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 状态指示器 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-center space-x-2">
            {Array.from({ length: progress.total }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < progress.completed
                    ? 'bg-green-500'
                    : index === progress.completed
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            {progress.completed === progress.total
              ? 'All checks completed'
              : `${progress.completed} of ${progress.total} checks completed`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckStatusIndicatorProps {
  status: CheckStatus;
  name: string;
  category: string;
  duration: number;
  message: string;
  className?: string;
}

function CheckStatusIndicator({
  status,
  name,
  category,
  duration,
  message,
  className
}: CheckStatusIndicatorProps) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case CheckStatus.PASSED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case CheckStatus.FAILED:
        return <X className="h-5 w-5 text-red-500" />;
      case CheckStatus.WARNING:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case CheckStatus.SKIPPED:
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="mt-1">
          {getStatusIcon(status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-600">{category}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDuration(duration)} • {message}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MiniCheckRunnerProps {
  isRunning: boolean;
  progress: number;
  total: number;
  currentCategory: string;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  className?: string;
}

export function MiniCheckRunner({
  isRunning,
  progress,
  total,
  currentCategory,
  onStart,
  onPause,
  onCancel,
  className
}: MiniCheckRunnerProps) {
  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Health Check</h3>
        <div className="flex space-x-2">
          {!isRunning && (
            <Button size="sm" onClick={onStart}>
              <Play className="h-3 w-3" />
            </Button>
          )}
          {isRunning && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-3 w-3" />
            </Button>
          )}
          {(isRunning || progress > 0) && (
            <Button size="sm" variant="destructive" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{progress}/{total} checks</span>
          <span>{Math.round((progress / total) * 100)}%</span>
        </div>
        <Progress value={(progress / total) * 100} className="h-2" />
        {isRunning && (
          <div className="text-xs text-gray-500">
            Running: {currentCategory}
          </div>
        )}
      </div>
    </div>
  );
}