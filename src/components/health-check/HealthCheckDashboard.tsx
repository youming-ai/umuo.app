'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Settings,
  FileText,
  TrendingUp,
  Shield,
  Zap,
  Monitor
} from 'lucide-react';
import { HealthCheckReport, CheckStatus, CheckCategory } from '@/lib/health-check/types';

interface HealthCheckDashboardProps {
  onRunCheck?: () => void;
  onViewReports?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function HealthCheckDashboard({
  onRunCheck,
  onViewReports,
  onOpenSettings,
  className
}: HealthCheckDashboardProps) {
  const [lastReport, setLastReport] = useState<HealthCheckReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [stats, setStats] = useState({
    totalChecks: 0,
    passedRate: 0,
    lastCheckTime: null as Date | null,
    nextScheduledTime: null as Date | null,
  });

  // 模拟加载最新报告
  useEffect(() => {
    // 在实际实现中，这里会从数据库加载最新报告
    loadLatestReport();
  }, []);

  const loadLatestReport = async () => {
    // 模拟数据
    const mockReport: HealthCheckReport = {
      id: 'report-123',
      version: '1.0',
      timestamp: new Date(),
      duration: 180000,
      summary: {
        total: 6,
        passed: 5,
        failed: 0,
        warnings: 1,
        skipped: 0,
        overallStatus: CheckStatus.WARNING,
        score: 85,
      },
      results: [],
      issues: [],
      recommendations: [],
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: 'Web',
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      metadata: {
        version: '1.0.0',
        environment: 'production',
      },
    };

    setLastReport(mockReport);
    setSystemStatus(getSystemStatus(mockReport.summary.overallStatus));
    setStats({
      totalChecks: mockReport.summary.total,
      passedRate: (mockReport.summary.passed / mockReport.summary.total) * 100,
      lastCheckTime: mockReport.timestamp,
      nextScheduledTime: null, // 计算下次计划检查时间
    });
  };

  const getSystemStatus = (status: CheckStatus): 'healthy' | 'warning' | 'error' => {
    switch (status) {
      case CheckStatus.PASSED:
        return 'healthy';
      case CheckStatus.WARNING:
        return 'warning';
      case CheckStatus.FAILED:
        return 'error';
      default:
        return 'healthy';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'error':
        return <Activity className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  const getCategoryIcon = (category: CheckCategory) => {
    switch (category) {
      case CheckCategory.API_CONNECTIVITY:
        return <Zap className="h-4 w-4" />;
      case CheckCategory.ERROR_HANDLING:
        return <Shield className="h-4 w-4" />;
      case CheckCategory.PERFORMANCE:
        return <TrendingUp className="h-4 w-4" />;
      case CheckCategory.USER_EXPERIENCE:
        return <Monitor className="h-4 w-4" />;
      case CheckCategory.SECURITY:
        return <Shield className="h-4 w-4" />;
      case CheckCategory.OFFLINE_CAPABILITY:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleRunCheck = () => {
    setIsRunning(true);
    onRunCheck?.();

    // 模拟检查完成
    setTimeout(() => {
      setIsRunning(false);
      loadLatestReport();
    }, 3000);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 系统状态概览 */}
      <Card className={`border-2 ${getStatusColor(systemStatus)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus)}
              <div>
                <CardTitle className="text-xl">
                  System Health: {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
                </CardTitle>
                <CardDescription>
                  Last checked: {formatTime(stats.lastCheckTime)}
                </CardDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleRunCheck}
                disabled={isRunning}
                className="flex items-center space-x-2"
              >
                {isRunning ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Run Check</span>
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onViewReports}>
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button variant="outline" onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        {lastReport && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastReport.summary.passed}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {lastReport.summary.warnings}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {lastReport.summary.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {lastReport.summary.score}%
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Health</span>
                <span>{lastReport.summary.score}%</span>
              </div>
              <Progress
                value={lastReport.summary.score}
                className="h-2"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* 快速统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChecks}</div>
            <p className="text-xs text-muted-foreground">
              System categories monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passedRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Last check performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastReport ? formatDuration(lastReport.duration) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last check duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 检查类别详情 */}
      <Card>
        <CardHeader>
          <CardTitle>Check Categories</CardTitle>
          <CardDescription>
            Status of individual system health checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="ux">UX</TabsTrigger>
              <TabsTrigger value="offline">Offline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(CheckCategory).map((category) => (
                  <div key={category} className="flex items-center space-x-3 p-3 border rounded-lg">
                    {getCategoryIcon(category)}
                    <div className="flex-1">
                      <div className="font-medium">{category.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: <Badge variant="secondary">Healthy</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 其他标签页内容可以在实际实现中添加 */}
            <TabsContent value="api">
              <div className="text-center py-8 text-muted-foreground">
                API connectivity details will be shown here
              </div>
            </TabsContent>

            <TabsContent value="performance">
              <div className="text-center py-8 text-muted-foreground">
                Performance metrics will be shown here
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="text-center py-8 text-muted-foreground">
                Security compliance results will be shown here
              </div>
            </TabsContent>

            <TabsContent value="ux">
              <div className="text-center py-8 text-muted-foreground">
                User experience validation results will be shown here
              </div>
            </TabsContent>

            <TabsContent value="offline">
              <div className="text-center py-8 text-muted-foreground">
                Offline capability status will be shown here
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}