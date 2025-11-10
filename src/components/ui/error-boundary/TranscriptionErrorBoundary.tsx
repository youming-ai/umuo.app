"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { FileText, Mic, Clock, AlertTriangle, RefreshCw, Download, FileAudio, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { MobileErrorBoundary } from "./MobileErrorBoundary";
import { ErrorClassifier, type ErrorContext } from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TranscriptionErrorBoundaryProps extends Omit<ErrorBoundaryProps, "children" | "context"> {
  children: ReactNode;
  transcriptionJob?: {
    id: string;
    fileId: string;
    fileName: string;
    status: string;
    progress?: number;
    error?: string;
    createdAt: string;
  };
  fallbackComponent?: ReactNode;
  enableRetry?: boolean;
  enableFallback?: boolean;
  onTranscriptionError?: (error: Error, jobInfo: any) => void;
  onRetryTranscription?: (jobId: string) => void;
  onFallbackTranscription?: (fileId: string) => void;
}

interface TranscriptionErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  transcriptionJob?: {
    id: string;
    fileId: string;
    fileName: string;
    status: string;
    progress?: number;
    error?: string;
    createdAt: string;
  };
  onRetry: () => void;
  onFallback: () => void;
  onDownloadFile?: () => void;
  onViewHistory?: () => void;
  onReset: () => void;
  enableRetry: boolean;
  enableFallback: boolean;
  isRecovering: boolean;
  recoveryAttempts: number;
  retryCount: number;
}

// ============================================================================
// TRANSCRIPTION ERROR BOUNDARY COMPONENT
// ============================================================================

export class TranscriptionErrorBoundary extends Component<TranscriptionErrorBoundaryProps> {
  private transcriptionErrorClassifier: ErrorClassifier;
  private retryCount = 0;

  constructor(props: TranscriptionErrorBoundaryProps) {
    super(props);
    this.transcriptionErrorClassifier = ErrorClassifier.getInstance();
  }

  private handleTranscriptionError = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // Enrich context with transcription-specific information
    const enrichedContext: ErrorContext = {
      ...context,
      component: "Transcription",
      transcriptionJob: this.props.transcriptionJob,
      retryCount: this.retryCount,
      transcriptionFeatures: {
        enableRetry: this.props.enableRetry,
        enableFallback: this.props.enableFallback,
      },
    };

    // Call parent error handler
    this.props.onError?.(error, errorInfo, enrichedContext);

    // Call specific transcription error handler
    this.props.onTranscriptionError?.(error, {
      transcriptionJob: this.props.transcriptionJob,
      context: enrichedContext,
    });

    // Log transcription-specific error
    this.transcriptionErrorClassifier.logError(error, enrichedContext);

    // Classify error for better handling
    const errorAnalysis = this.transcriptionErrorClassifier.classifyError(error, enrichedContext);

    // Auto-retry for transient errors
    if (this.shouldAutoRetry(errorAnalysis) && this.retryCount < 3) {
      this.handleAutoRetry();
    }
  };

  private shouldAutoRetry = (errorAnalysis: any): boolean => {
    // Auto-retry for network or timeout errors
    return (
      errorAnalysis.category === "network" ||
      errorAnalysis.type === "TimeoutError" ||
      errorAnalysis.type === "NetworkError" ||
      errorAnalysis.severity === "low"
    );
  };

  private handleAutoRetry = async () => {
    this.retryCount++;

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);

    await new Promise(resolve => setTimeout(resolve, delay));

    if (this.props.transcriptionJob?.id && this.props.onRetryTranscription) {
      this.props.onRetryTranscription(this.props.transcriptionJob.id);
    }
  };

  private handleRetryTranscription = () => {
    this.retryCount++;

    if (this.props.transcriptionJob?.id && this.props.onRetryTranscription) {
      this.props.onRetryTranscription(this.props.transcriptionJob.id);
    }
  };

  private handleFallbackTranscription = () => {
    if (this.props.transcriptionJob?.fileId && this.props.onFallbackTranscription) {
      this.props.onFallbackTranscription(this.props.transcriptionJob.fileId);
    }
  };

  private handleDownloadFile = () => {
    if (this.props.transcriptionJob?.fileId) {
      const link = document.createElement("a");
      link.href = `/api/files/${this.props.transcriptionJob.fileId}/download`;
      link.download = this.props.transcriptionJob.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  private handleViewHistory = () => {
    // Navigate to transcription history or open a modal
    console.log("View transcription history");
  };

  render() {
    const {
      children,
      transcriptionJob,
      fallbackComponent,
      enableRetry = true,
      enableFallback = true,
      ...errorBoundaryProps
    } = this.props;

    // Create transcription-specific error context
    const transcriptionContext: Partial<ErrorContext> = {
      component: "Transcription",
      category: "transcription",
      transcriptionJob,
      features: {
        enableRetry,
        enableFallback,
      },
    };

    // Use mobile error boundary if on mobile device
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return (
        <MobileErrorBoundary
          {...errorBoundaryProps}
          context={transcriptionContext}
          onError={this.handleTranscriptionError}
          enableRecovery={true}
          fallbackComponent={
            fallbackComponent || (
              <MobileTranscriptionErrorFallback
                transcriptionJob={transcriptionJob}
                enableRetry={enableRetry}
                enableFallback={enableFallback}
                onRetryTranscription={this.handleRetryTranscription}
                onFallbackTranscription={this.handleFallbackTranscription}
                onDownloadFile={this.handleDownloadFile}
                onViewHistory={this.handleViewHistory}
                retryCount={this.retryCount}
              />
            )
          }
        >
          {children}
        </MobileErrorBoundary>
      );
    }

    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        context={transcriptionContext}
        onError={this.handleTranscriptionError}
        enableRecovery={true}
        fallbackComponent={
          fallbackComponent || (
            <TranscriptionErrorFallback
              transcriptionJob={transcriptionJob}
              enableRetry={enableRetry}
              enableFallback={enableFallback}
              onRetryTranscription={this.handleRetryTranscription}
              onFallbackTranscription={this.handleFallbackTranscription}
              onDownloadFile={this.handleDownloadFile}
              onViewHistory={this.handleViewHistory}
              retryCount={this.retryCount}
            />
          )
        }
      >
        {children}
      </ErrorBoundary>
    );
  }
}

// ============================================================================
// TRANSCRIPTION ERROR FALLBACK COMPONENT
// ============================================================================

const TranscriptionErrorFallback: React.FC<TranscriptionErrorFallbackProps> = ({
  error,
  errorInfo,
  transcriptionJob,
  onRetry,
  onFallback,
  onDownloadFile,
  onViewHistory,
  onReset,
  enableRetry,
  enableFallback,
  isRecovering,
  recoveryAttempts,
  retryCount,
}) => {
  const isTranscriptionError = error.message.toLowerCase().includes("transcription") ||
                               error.message.toLowerCase().includes("whisper") ||
                               error.message.toLowerCase().includes("groq");

  const isNetworkError = error.message.toLowerCase().includes("network") ||
                        error.message.toLowerCase().includes("timeout") ||
                        error.message.toLowerCase().includes("connection");

  const getErrorIcon = () => {
    if (isNetworkError) {
      return <AlertTriangle className="h-8 w-8 text-orange-500" />;
    }
    if (isTranscriptionError) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <Mic className="h-8 w-8 text-destructive" />;
  };

  const getErrorTitle = () => {
    if (isNetworkError) {
      return "转录服务连接失败";
    }
    if (isTranscriptionError) {
      return "转录处理错误";
    }
    return "转录组件错误";
  };

  const getErrorMessage = () => {
    if (isNetworkError) {
      return "无法连接到转录服务，请检查网络连接后重试。";
    }
    if (isTranscriptionError) {
      return "转录处理过程中遇到问题，可能是文件格式不支持或服务暂时不可用。";
    }
    return "转录功能出现错误，请重试或使用备用方案。";
  };

  const getErrorSuggestions = () => {
    if (isNetworkError) {
      return [
        "检查网络连接",
        "尝试刷新页面",
        "等待几分钟后重试",
        "联系技术支持",
      ];
    }
    if (isTranscriptionError) {
      return [
        "检查音频文件格式",
        "尝试重新上传文件",
        "使用备用转录服务",
        "转换音频格式后重试",
      ];
    }
    return [
      "重新加载页面",
      "清除浏览器缓存",
      "尝试其他浏览器",
      "下载文件使用其他工具处理",
    ];
  };

  const getProgressPercentage = () => {
    if (!transcriptionJob?.progress) return 0;
    return transcriptionJob.progress;
  };

  const getStatusBadge = () => {
    switch (transcriptionJob?.status) {
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "processing":
        return <Badge variant="default">处理中</Badge>;
      case "completed":
        return <Badge variant="default">完成</Badge>;
      case "pending":
        return <Badge variant="secondary">等待中</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            {getErrorIcon()}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{getErrorTitle()}</CardTitle>
            <CardDescription>{getErrorMessage()}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>

        {transcriptionJob && (
          <div className="rounded-md bg-muted p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileAudio className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{transcriptionJob.fileName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  ID: {transcriptionJob.id.slice(0, 8)}...
                </Badge>
                {retryCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    重试 {retryCount}
                  </Badge>
                )}
              </div>
            </div>

            {transcriptionJob.progress !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">进度</span>
                  <span className="font-medium">{transcriptionJob.progress}%</span>
                </div>
                <Progress value={transcriptionJob.progress} className="h-2" />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>创建时间: {new Date(transcriptionJob.createdAt).toLocaleString()}</span>
              {transcriptionJob.error && (
                <span className="text-destructive">错误: {transcriptionJob.error}</span>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Actions */}
        <div className="grid grid-cols-2 gap-2">
          {enableRetry && (
            <Button
              onClick={onRetry}
              disabled={isRecovering || recoveryAttempts >= 3}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试转录 {retryCount > 0 && `(${retryCount}/3)`}
            </Button>
          )}

          {enableFallback && (
            <Button onClick={onFallback} variant="outline" className="w-full">
              <ChevronRight className="mr-2 h-4 w-4" />
              备用转录
            </Button>
          )}

          <Button onClick={onReset} variant="outline" className="w-full">
            重置组件
          </Button>

          {transcriptionJob && onDownloadFile && (
            <Button onClick={onDownloadFile} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              下载文件
            </Button>
          )}

          {onViewHistory && (
            <Button onClick={onViewHistory} variant="outline" className="w-full">
              <Clock className="mr-2 h-4 w-4" />
              转录历史
            </Button>
          )}
        </div>

        {/* Recovery Progress */}
        {isRecovering && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-800">
                正在尝试恢复转录服务... (尝试 {recoveryAttempts + 1}/3)
              </span>
            </div>
          </div>
        )}

        {/* Retry Attempts Status */}
        {retryCount >= 3 && (
          <div className="rounded-md bg-orange-50 p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800 text-sm">
                已达到最大重试次数，建议使用备用转录服务或下载文件处理。
              </span>
            </div>
          </div>
        )}

        {/* Error Suggestions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">建议的解决方案：</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {getErrorSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-center space-x-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="font-medium text-sm">AI 服务状态</span>
            </div>
            <p className="text-muted-foreground text-xs">Groq Whisper 服务运行正常</p>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${isNetworkError ? 'bg-orange-500' : 'bg-green-500'}`}></div>
              <span className="font-medium text-sm">网络连接</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {isNetworkError ? '连接不稳定' : '连接正常'}
            </p>
          </div>
        </div>

        {/* Technical Details */}
        {process.env.NODE_ENV === "development" && (
          <>
            <Separator />
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                  开发模式
                </Badge>
                <span className="font-medium text-sm text-yellow-700">
                  技术详情
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-yellow-700 hover:text-yellow-800">
                  查看错误详情
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-yellow-100 p-3 text-xs text-yellow-900">
                  {JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    isTranscriptionError,
                    isNetworkError,
                    transcriptionJob,
                    retryCount,
                    recoveryAttempts,
                    timestamp: new Date().toISOString(),
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MOBILE TRANSCRIPTION ERROR FALLBACK
// ============================================================================

const MobileTranscriptionErrorFallback: React.FC<TranscriptionErrorFallbackProps> = ({
  error,
  transcriptionJob,
  onRetry,
  onFallback,
  onDownloadFile,
  onViewHistory,
  enableRetry,
  enableFallback,
  retryCount,
}) => {
  const isNetworkError = error.message.toLowerCase().includes("network");

  return (
    <div className="p-4 space-y-4">
      <div className="text-center space-y-2">
        {isNetworkError ? (
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
        ) : (
          <FileText className="h-12 w-12 text-destructive mx-auto" />
        )}
        <h3 className="font-semibold text-lg">转录错误</h3>
        <p className="text-muted-foreground text-sm">
          {isNetworkError ? "网络连接问题" : "转录处理错误"}
        </p>
      </div>

      {transcriptionJob && (
        <div className="rounded-md bg-muted p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">{transcriptionJob.fileName}</span>
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                重试 {retryCount}
              </Badge>
            )}
          </div>
          {transcriptionJob.progress !== undefined && (
            <Progress value={transcriptionJob.progress} className="h-2" />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {enableRetry && (
          <Button onClick={onRetry} size="sm" className="w-full">
            <RefreshCw className="mr-1 h-3 w-3" />
            重试
          </Button>
        )}
        {enableFallback && (
          <Button onClick={onFallback} variant="outline" size="sm" className="w-full">
            备用方案
          </Button>
        )}
        {transcriptionJob && onDownloadFile && (
          <Button onClick={onDownloadFile} variant="outline" size="sm" className="w-full">
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
        )}
        {onViewHistory && (
          <Button onClick={onViewHistory} variant="outline" size="sm" className="w-full">
            <Clock className="mr-1 h-3 w-3" />
            历史
          </Button>
        )}
      </div>

      <div className="text-center">
        <p className="text-muted-foreground text-xs">
          {isNetworkError ? "检查网络连接后重试" : "尝试备用转录方案"}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

export const TranscriptionJobErrorBoundary: React.FC<{
  children: ReactNode;
  job?: any;
  onRetry?: (jobId: string) => void;
  onFallback?: (fileId: string) => void;
}> = ({ children, job, onRetry, onFallback }) => (
  <TranscriptionErrorBoundary
    transcriptionJob={job}
    enableRetry={true}
    enableFallback={true}
    onRetryTranscription={onRetry}
    onFallbackTranscription={onFallback}
    showDetails={false}
    allowReport={false}
    maxErrors={5}
  >
    {children}
  </TranscriptionErrorBoundary>
);

export const UploadTranscriptionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TranscriptionErrorBoundary
    enableRetry={true}
    enableFallback={true}
    fallbackMessage="文件上传和转录过程中出现错误，请重试或使用其他文件。"
    showDetails={false}
    allowReport={false}
  >
    {children}
  </TranscriptionErrorBoundary>
);
