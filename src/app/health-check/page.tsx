'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HealthCheckDashboard } from '@/components/health-check/HealthCheckDashboard';
import { CheckRunner, MiniCheckRunner } from '@/components/health-check/CheckRunner';
import { ReportViewer } from '@/components/health-check/ReportViewer';
import { SettingsManager } from '@/components/health-check/SettingsManager';
import { NotificationManager } from '@/components/health-check/NotificationManager';
import useHealthCheck from '@/hooks/useHealthCheck';
import { CheckStatus } from '@/lib/health-check/types';
import { HealthCheckProvider } from '@/lib/health-check/context';
import {
  Heart,
  Activity,
  Settings,
  Bell,
  FileText,
  Play,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

function HealthCheckPage() {
  const { state, actions } = useHealthCheck();
  const latestReport = state.latestReport;
  const isRunning = state.currentCheck.isRunning;
  const progress = state.currentCheck.progress;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // 暂时使用模拟数据，因为getStats函数在context中不存在
        const mockStats = {
          totalReports: state.reports.length,
          successRate: state.reports.length > 0 ?
            state.reports.filter(r => r.summary.overallStatus === CheckStatus.PASSED).length / state.reports.length : 0,
          averageResponseTime: 250, // 模拟数据
          lastCheckTime: latestReport?.timestamp || null
        };
        setStats(mockStats);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, [state.reports, latestReport]);

  // 监听健康检查状态变化，自动切换到相应标签页
  useEffect(() => {
    if (latestReport && !isRunning && activeTab === 'dashboard') {
      // 检查完成后可以自动显示报告
      if (latestReport.summary.failed > 0) {
        setActiveTab('reports');
      }
    }
  }, [latestReport, isRunning, activeTab]);

  const handleQuickCheck = async () => {
    try {
      await actions.runCheck();
      setActiveTab('runner');
    } catch (error) {
      console.error('启动健康检查失败:', error);
    }
  };

  const getSystemStatus = () => {
    if (!latestReport) return { status: 'unknown', text: '未检查', color: 'gray' };

    const { passed, failed, warnings } = latestReport.summary;
    const total = passed + failed + warnings;

    if (failed > 0) return { status: 'error', text: `发现 ${failed} 个问题`, color: 'red' };
    if (warnings > 0) return { status: 'warning', text: `有 ${warnings} 个警告`, color: 'yellow' };
    if (passed === total && total > 0) return { status: 'healthy', text: '系统正常', color: 'green' };
    return { status: 'unknown', text: '状态未知', color: 'gray' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Heart className="h-8 w-8 text-red-500" />
              <span>健康检查中心</span>
            </h1>
            <p className="text-gray-600 mt-2">
              监控系统健康状况，确保AI转录功能稳定运行
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* 系统状态指示器 */}
            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2">
                {systemStatus.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {systemStatus.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                {systemStatus.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                {systemStatus.status === 'unknown' && <Clock className="h-5 w-5 text-gray-500" />}
                <span className="font-medium">{systemStatus.text}</span>
              </div>
            </Card>

            {/* 快速操作按钮 */}
            <Button onClick={handleQuickCheck} disabled={isRunning} className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>快速检查</span>
            </Button>

            {/* 通知按钮 */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-4 w-4" />
              </Button>
              {/* 通知徽章（示例） */}
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </div>
          </div>
        </div>

        {/* 统计概览 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总检查次数</p>
                    <p className="text-2xl font-bold">{stats.totalReports || 0}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">成功率</p>
                    <p className="text-2xl font-bold">
                      {stats.successRate ? `${(stats.successRate * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">平均响应时间</p>
                    <p className="text-2xl font-bold">
                      {stats.averageResponseTime ? `${stats.averageResponseTime}ms` : 'N/A'}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">最后检查</p>
                    <p className="text-sm font-bold">
                      {stats.lastCheckTime ? new Date(stats.lastCheckTime).toLocaleString('zh-CN') : '从未'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>仪表板</span>
            </TabsTrigger>
            <TabsTrigger value="runner" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>检查执行</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>检查报告</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>通知中心</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>系统设置</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <HealthCheckDashboard
              onRunCheck={handleQuickCheck}
              onViewReports={() => setActiveTab('reports')}
            />
          </TabsContent>

          <TabsContent value="runner" className="space-y-6">
            <CheckRunner
              isRunning={isRunning}
              progress={{
                completed: progress.completed,
                total: progress.total,
                percentage: progress.percentage,
                currentCategory: progress.currentCategory
              }}
              estimatedTimeRemaining={state.currentCheck.estimatedTimeRemaining}
              currentCheckId={state.currentCheck.id}
              onStart={() => actions.runCheck()}
              onPause={() => {/* 暂时留空，context中没有pause函数 */}}
              onCancel={() => {/* 暂时留空，context中没有cancel函数 */}}
              onResume={() => {/* 暂时留空，context中没有resume函数 */}}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {latestReport ? (
              <ReportViewer
                report={latestReport}
                onExport={async (format) => {
                  try {
                    // 暂时留空，context中没有exportData函数
                    console.log('导出格式:', format);
                  } catch (error) {
                    console.error('导出失败:', error);
                  }
                }}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无检查报告</p>
                    <p className="text-sm mt-2">请先运行健康检查以生成报告</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationManager
              onNotificationClick={(notification) => {
                console.log('通知点击:', notification);
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsManager
              onClose={() => setActiveTab('dashboard')}
            />
          </TabsContent>
        </Tabs>

        {/* 浮动通知面板 */}
        {showNotifications && (
          <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-hidden bg-white rounded-lg shadow-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">通知</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <NotificationManager />
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {latestReport && (
                  <span>
                    最后检查: {new Date(latestReport.timestamp).toLocaleString('zh-CN')} •
                    状态: <Badge variant={latestReport.summary.failed > 0 ? 'destructive' : 'default'}>
                      {latestReport.summary.passed} 通过, {latestReport.summary.failed} 失败, {latestReport.summary.warnings} 警告
                    </Badge>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => actions.loadReports()}>
                  刷新数据
                </Button>
                <Button variant="outline" size="sm" onClick={() => {/* 暂时留空，清理缓存功能 */}}>
                  清理缓存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Create a wrapper component that provides the context
function HealthCheckPageWithProvider() {
  return (
    <HealthCheckProvider>
      <HealthCheckPage />
    </HealthCheckProvider>
  );
}

// Force client-side rendering to avoid prerendering issues
export default dynamic(() => Promise.resolve(HealthCheckPageWithProvider), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Health Check...</p>
      </div>
    </div>
  ),
});