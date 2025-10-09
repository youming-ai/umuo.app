'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle,
  XCircle,
  X,
  AlertTriangle,
  Clock,
  Download,
  Calendar,
  FileText,
  TrendingUp,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { HealthCheckReport, CheckStatus, SeverityLevel, CheckCategory } from '@/lib/health-check/types';
import { formatDuration, formatRelativeTime, getStatusColor, getSeverityColor } from '@/hooks/useHealthCheck';
import { HealthCheckExporter, ExportFormat } from '@/lib/health-check/export';

interface ReportViewerProps {
  report: HealthCheckReport;
  onExport?: (format: ExportFormat) => void;
  onDelete?: (reportId: string) => void;
  className?: string;
}

export function ReportViewer({
  report,
  onExport,
  onDelete,
  className
}: ReportViewerProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case CheckStatus.PASSED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case CheckStatus.FAILED:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case CheckStatus.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case SeverityLevel.HIGH:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case SeverityLevel.MEDIUM:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case SeverityLevel.LOW:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: CheckCategory) => {
    const iconMap = {
      [CheckCategory.API_CONNECTIVITY]: <Shield className="h-4 w-4" />,
      [CheckCategory.ERROR_HANDLING]: <AlertTriangle className="h-4 w-4" />,
      [CheckCategory.PERFORMANCE]: <TrendingUp className="h-4 w-4" />,
      [CheckCategory.USER_EXPERIENCE]: <FileText className="h-4 w-4" />,
      [CheckCategory.SECURITY]: <Shield className="h-4 w-4" />,
      [CheckCategory.OFFLINE_CAPABILITY]: <Calendar className="h-4 w-4" />,
    };
    return iconMap[category] || <FileText className="h-4 w-4" />;
  };

  const toggleIssueExpansion = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const toggleRecommendationExpansion = (recommendationId: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(recommendationId)) {
      newExpanded.delete(recommendationId);
    } else {
      newExpanded.add(recommendationId);
    }
    setExpandedRecommendations(newExpanded);
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const blob = await HealthCheckExporter.exportReport(report.id, format);
      const filename = HealthCheckExporter.generateFilename(report.id, format);
      HealthCheckExporter.downloadBlob(blob, filename);
      onExport?.(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      onDelete?.(report.id);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 报告头部 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                {getStatusIcon(report.summary.overallStatus)}
                <div>
                  <CardTitle className="text-xl">
                    Health Check Report
                  </CardTitle>
                  <CardDescription>
                    {formatRelativeTime(report.timestamp)}
                  </CardDescription>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {report.summary.score}%
              </div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {report.summary.passed}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {report.summary.warnings}
              </div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {report.summary.failed}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {formatDuration(report.duration)}
              </div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
          </div>

          {/* 整体状态进度条 */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className={getStatusColor(report.summary.overallStatus)}>
                {report.summary.overallStatus.toUpperCase()}
              </span>
              <span>{report.summary.score}% Health Score</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(report.summary.overallStatus).replace('text-', 'bg-')}`}
                style={{ width: `${report.summary.score}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细报告内容 */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* 检查结果 */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check Results</CardTitle>
              <CardDescription>
                Detailed results for each health check category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.results.map((result, index) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-gray-600">
                            {result.category}
                          </div>
                        </div>
                      </div>
                      <Badge variant={result.status === CheckStatus.PASSED ? 'secondary' : 'destructive'}>
                        {result.status}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-700">{result.message}</p>
                      {result.metrics && (
                        <div className="mt-2 text-xs text-gray-500">
                          Duration: {formatDuration(result.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 问题列表 */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues Found</CardTitle>
              <CardDescription>
                Problems identified during the health check
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.issues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No issues found!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.issues.map((issue) => (
                    <div key={issue.id} className="border rounded-lg">
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleIssueExpansion(issue.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getSeverityIcon(issue.severity)}
                            <div>
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-sm text-gray-600">
                                {issue.category}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                          >
                            {expandedIssues.has(issue.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">{issue.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Impact: {issue.impact}
                          </p>
                        </div>
                      </div>
                      {expandedIssues.has(issue.id) && (
                        <div className="px-4 pb-4 border-t">
                          {issue.rootCause && (
                            <div className="mt-3">
                              <h5 className="font-medium text-sm">Root Cause:</h5>
                              <p className="text-sm text-gray-600 mt-1">
                                {issue.rootCause.description}
                              </p>
                              {issue.rootCause.evidence && (
                                <div className="mt-1">
                                  <span className="text-xs text-gray-500">Evidence:</span>
                                  <ul className="text-xs text-gray-600 mt-1 ml-4">
                                    {issue.rootCause.evidence.map((evidence, index) => (
                                      <li key={index}>{evidence}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                          {issue.resolution && (
                            <div className="mt-3">
                              <h5 className="font-medium text-sm">Resolution Steps:</h5>
                              <ol className="text-sm text-gray-600 mt-1 ml-4">
                                {issue.resolution.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                              <div className="text-xs text-gray-500 mt-2">
                                <span>Difficulty:</span> {issue.resolution.difficulty}
                                <span className="ml-2">
                                  <span>Estimated time:</span> {issue.resolution.estimatedTime} minutes
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 建议 */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Suggestions for improving system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.recommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p>No specific recommendations at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.recommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg">
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleRecommendationExpansion(recommendation.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Lightbulb className="h-5 w-5 text-blue-500" />
                            <div>
                              <div className="font-medium">{recommendation.title}</div>
                              <div className="text-sm text-gray-600">
                                {recommendation.category}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                recommendation.priority === 'high'
                                  ? 'destructive'
                                  : recommendation.priority === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {recommendation.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1"
                            >
                              {expandedRecommendations.has(recommendation.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">{recommendation.description}</p>
                        </div>
                      </div>
                      {expandedRecommendations.has(recommendation.id) && (
                        <div className="px-4 pb-4 border-t">
                          <div className="mt-3">
                            <h5 className="font-medium text-sm">Implementation Details:</h5>
                            <div className="text-sm text-gray-600 mt-1">
                              <p>
                                <span className="font-medium">Effort:</span>{' '}
                                {recommendation.implementation.effort}
                              </p>
                              <p>
                                <span className="font-medium">Timeframe:</span>{' '}
                                {recommendation.implementation.timeframe}
                              </p>
                              {recommendation.implementation.resources && (
                                <p>
                                  <span className="font-medium">Resources:</span>{' '}
                                  {recommendation.implementation.resources.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="mt-3">
                              <h5 className="font-medium text-sm">Expected Benefits:</h5>
                              <ul className="text-sm text-gray-600 mt-1 ml-4">
                                {recommendation.benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                            {recommendation.relatedIssues.length > 0 && (
                              <div className="mt-3">
                                <h5 className="font-medium text-sm">Related Issues:</h5>
                                <div className="text-xs text-gray-600 mt-1">
                                  {recommendation.relatedIssues.join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 详细信息 */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details about the system and environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Environment</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Platform:</span>{' '}
                      {report.systemInfo.platform}
                    </div>
                    <div>
                      <span className="font-medium">Language:</span>{' '}
                      {report.systemInfo.language}
                    </div>
                    <div>
                      <span className="font-medium">Time Zone:</span>{' '}
                      {report.systemInfo.timeZone}
                    </div>
                    <div>
                      <span className="font-medium">User Agent:</span>{' '}
                      <div className="text-xs text-gray-600 mt-1 break-all">
                        {report.systemInfo.userAgent}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Report Metadata</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Report ID:</span>{' '}
                      {report.id}
                    </div>
                    <div>
                      <span className="font-medium">Version:</span>{' '}
                      {report.version}
                    </div>
                    <div>
                      <span className="font-medium">Generated:</span>{' '}
                      {report.timestamp.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Environment:</span>{' '}
                      <Badge
                        variant={
                          report.metadata.environment === 'production'
                            ? 'destructive'
                            : report.metadata.environment === 'development'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {report.metadata.environment}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">App Version:</span>{' '}
                      {report.metadata.version}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 检查统计 */}
          <Card>
            <CardHeader>
              <CardTitle>Check Statistics</CardTitle>
              <CardDescription>
                Detailed statistics about the health check execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {report.summary.total}
                    </div>
                    <div className="text-sm text-gray-600">Total Checks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {report.summary.passed}
                    </div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {report.summary.failed}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h5 className="font-medium mb-2">By Category</h5>
                  <div className="space-y-2">
                    {Object.values(CheckCategory).map(category => {
                      const categoryResults = report.results.filter(
                        result => result.category === category
                      );
                      const passedInCategory = categoryResults.filter(
                        result => result.status === CheckStatus.PASSED
                      ).length;

                      return (
                        <div
                          key={category}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(category)}
                            <span className="text-sm">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600">{passedInCategory}</span>
                            <span className="text-gray-500">/</span>
                            <span className="text-gray-700">
                              {categoryResults.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}