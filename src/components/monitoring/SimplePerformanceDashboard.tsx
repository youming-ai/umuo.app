import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimplePerformanceMonitor } from "@/hooks/useSimplePerformanceMonitor";

export const SimplePerformanceDashboard: React.FC = () => {
  const { totalMetrics, averageApiTime, isMonitoring, getMetrics, clearMetrics, setMonitoring } =
    useSimplePerformanceMonitor();

  const allMetrics = getMetrics();

  // 过滤不同类型的指标
  const apiMetrics = allMetrics.filter(
    (m) => m.operationName?.startsWith("api_") || m.metadata?.type === "api",
  );
  const transcriptionMetrics = allMetrics.filter(
    (m) => m.operationName === "transcription" || m.metadata?.type === "transcription",
  );

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTranscriptionErrorRate = (): number => {
    const totalTranscriptions = transcriptionMetrics.length;
    if (totalTranscriptions === 0) return 0;

    const failedTranscriptions = transcriptionMetrics.filter(
      (m) => m.metadata?.success === false,
    ).length;

    return (failedTranscriptions / totalTranscriptions) * 100;
  };

  const transcriptionErrorRate = getTranscriptionErrorRate();

  const getStatusColor = (errorRate: number): string => {
    if (errorRate > 10) return "text-red-600";
    if (errorRate > 5) return "text-yellow-600";
    return "text-green-600";
  };

  const exportData = () => {
    const data = JSON.stringify(allMetrics, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">性能监控</h2>
          <p className="text-muted-foreground">基础性能指标监控</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "监控中" : "已暂停"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setMonitoring(!isMonitoring)}>
            {isMonitoring ? "暂停" : "开始"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearMetrics}>
            清除数据
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            导出数据
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总指标数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics}</div>
            <p className="text-xs text-muted-foreground">收集的性能指标</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API 响应时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageApiTime > 0 ? formatDuration(averageApiTime) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">平均响应时间</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">转录错误率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(transcriptionErrorRate)}`}>
              {transcriptionErrorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">转录任务错误率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API 调用次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiMetrics.length}</div>
            <p className="text-xs text-muted-foreground">总计 API 调用</p>
          </CardContent>
        </Card>
      </div>

      {/* 详细指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* API 指标 */}
        <Card>
          <CardHeader>
            <CardTitle>API 指标详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apiMetrics.slice(-10).map((metric, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {metric.operationName?.replace("api_", "") || metric.name}
                  </span>
                  <span className="font-medium">{formatDuration(metric.duration || 0)}</span>
                </div>
              ))}
              {apiMetrics.length === 0 && (
                <p className="text-muted-foreground text-sm">暂无 API 指标</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 转录指标 */}
        <Card>
          <CardHeader>
            <CardTitle>转录指标详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transcriptionMetrics.slice(-10).map((metric, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {metric.metadata?.success === false ? "转录失败" : "转录成功"}
                  </span>
                  <span
                    className={`font-medium ${
                      metric.metadata?.success === false ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {metric.metadata?.success === false
                      ? "失败"
                      : formatDuration(metric.duration || 0)}
                  </span>
                </div>
              ))}
              {transcriptionMetrics.length === 0 && (
                <p className="text-muted-foreground text-sm">暂无转录指标</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
