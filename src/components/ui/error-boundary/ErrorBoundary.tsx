"use client";

import React, { Component, ErrorInfo, ReactNode, createContext, useContext } from "react";
import { AlertTriangle, Bug, Copy, RefreshCw, Wifi, WifiOff, Smartphone, HeadphonesIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ErrorClassifier,
  RecoveryStrategy,
  type ErrorContext,
  type ErrorAnalysis,
  type RecoveryPlan,
  MobileRecoveryOptimization,
  getRecoveryStatistics,
} from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => void;
  onRecovery?: (plan: RecoveryPlan, result: any) => void;
  showDetails?: boolean;
  allowReset?: boolean;
  allowReport?: boolean;
  maxErrors?: number;
  errorDebounceMs?: number;
  enableRecovery?: boolean;
  context?: Partial<ErrorContext>;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  errorContext: ErrorContext | null;
  errorAnalysis: ErrorAnalysis | null;
  recoveryPlan: RecoveryPlan | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  uiState: "error" | "recovering" | "recovered" | "failed";
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorContext: ErrorContext | null;
  errorAnalysis: ErrorAnalysis | null;
  onReset: () => void;
  onReload: () => void;
  onReport: () => void;
  onRetryRecovery: () => void;
  showDetails: boolean;
  allowReset: boolean;
  allowReport: boolean;
  errorCount: number;
  isRecovering: boolean;
  recoveryAttempts: number;
  uiState: ErrorBoundaryState["uiState"];
  theme: "light" | "dark" | "auto";
  className?: string;
}

// ============================================================================
// ERROR BOUNDARY CONTEXT
// ============================================================================

const ErrorBoundaryContext = createContext<{
  error: Error | null;
  errorContext: ErrorContext | null;
  recoveryPlan: RecoveryPlan | null;
  isRecovering: boolean;
  triggerRecovery: () => void;
} | null>(null);

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error("useErrorBoundary must be used within an ErrorBoundary");
  }
  return context;
};

// ============================================================================
// MAIN ERROR BOUNDARY COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorClassifier: ErrorClassifier;
  private recoveryStrategy: RecoveryStrategy;
  private mobileOptimization: MobileRecoveryOptimization;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      errorContext: null,
      errorAnalysis: null,
      recoveryPlan: null,
      isRecovering: false,
      recoveryAttempts: 0,
      uiState: "error",
    };

    // Initialize error handling systems
    this.errorClassifier = ErrorClassifier.getInstance();
    this.recoveryStrategy = new RecoveryStrategy();
    this.mobileOptimization = new MobileRecoveryOptimization();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    const maxErrors = this.props.maxErrors || 10;
    const errorDebounceMs = this.props.errorDebounceMs || 5000;

    // Rate limiting: ignore errors if too many occurred recently
    if (timeSinceLastError < errorDebounceMs && this.state.errorCount >= maxErrors) {
      console.warn("Error boundary: Rate limiting activated, ignoring error");
      return;
    }

    // Create error context
    const errorContext: ErrorContext = {
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      ...this.props.context,
    };

    // Analyze error
    const errorAnalysis = this.errorClassifier.analyzeError(error, errorContext);

    // Generate recovery plan if enabled
    let recoveryPlan: RecoveryPlan | null = null;
    if (this.props.enableRecovery !== false && this.state.recoveryAttempts < 3) {
      recoveryPlan = this.recoveryStrategy.generateRecoveryPlan(errorAnalysis, {
        enableMobileOptimizations: this.mobileOptimization.isMobileDevice(),
        maxRetries: 3 - this.state.recoveryAttempts,
      });
    }

    // Call external error handler
    this.props.onError?.(error, errorInfo, errorContext);

    // Update state
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorContext,
      errorAnalysis,
      recoveryPlan,
      errorCount: timeSinceLastError < errorDebounceMs ? prevState.errorCount + 1 : 1,
      lastErrorTime: now,
      recoveryAttempts: prevState.recoveryAttempts,
      isRecovering: false,
      uiState: "error",
    }));

    // Log error for analytics
    this.errorClassifier.logError(error, errorContext);
  }

  // Handle error recovery
  private handleRecovery = async (): Promise<void> => {
    if (!this.state.recoveryPlan || this.state.isRecovering) {
      return;
    }

    this.setState({ isRecovering: true, uiState: "recovering" });

    try {
      const result = await this.recoveryStrategy.executeRecoveryPlan(
        this.state.recoveryPlan,
        {
          enableMobileOptimizations: this.mobileOptimization.isMobileDevice(),
          timeout: 30000,
        }
      );

      if (result.success) {
        this.setState({
          isRecovering: false,
          uiState: "recovered",
        });

        // Notify parent component of successful recovery
        this.props.onRecovery?.(this.state.recoveryPlan!, result);

        // Auto-reset after successful recovery
        setTimeout(() => {
          this.handleReset();
        }, 2000);
      } else {
        this.setState({
          isRecovering: false,
          uiState: "failed",
          recoveryAttempts: this.state.recoveryAttempts + 1,
        });
      }
    } catch (error) {
      console.error("Error recovery failed:", error);
      this.setState({
        isRecovering: false,
        uiState: "failed",
        recoveryAttempts: this.state.recoveryAttempts + 1,
      });
    }
  };

  // Reset error boundary state
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorContext: null,
      errorAnalysis: null,
      recoveryPlan: null,
      isRecovering: false,
      recoveryAttempts: 0,
      uiState: "error",
    });
  };

  // Reload the page
  private handleReload = (): void => {
    window.location.reload();
  };

  // Report error (can be integrated with external services)
  private handleReport = (): void => {
    if (this.state.error && this.state.errorContext) {
      // This can be integrated with error reporting services like Sentry
      const reportData = {
        error: {
          message: this.state.error.message,
          stack: this.state.error.stack,
          name: this.state.error.name,
        },
        context: this.state.errorContext,
        analysis: this.state.errorAnalysis,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
        url: typeof window !== "undefined" ? window.location.href : "",
        timestamp: new Date().toISOString(),
      };

      console.log("Error report data:", reportData);

      // In a real implementation, you would send this to your error reporting service
      // Example: Sentry.captureException(this.state.error, { extra: reportData });
    }
  };

  private getErrorIcon = (category?: string) => {
    switch (category) {
      case "network":
        return <WifiOff className="h-6 w-6" />;
      case "mobile":
        return <Smartphone className="h-6 w-6" />;
      case "performance":
        return <Zap className="h-6 w-6" />;
      case "audio":
        return <HeadphonesIcon className="h-6 w-6" />;
      default:
        return <AlertTriangle className="h-6 w-6" />;
    }
  };

  render() {
    const { fallback, children } = this.props;
    const { hasError, error, errorInfo, errorContext, errorAnalysis, recoveryPlan, isRecovering, uiState } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorBoundaryContext.Provider
          value={{
            error,
            errorContext,
            recoveryPlan,
            isRecovering,
            triggerRecovery: this.handleRecovery,
          }}
        >
          <ErrorFallback
            error={error}
            errorInfo={errorInfo}
            errorContext={errorContext}
            errorAnalysis={errorAnalysis}
            onReset={this.handleReset}
            onReload={this.handleReload}
            onReport={this.handleReport}
            onRetryRecovery={this.handleRecovery}
            showDetails={this.props.showDetails ?? true}
            allowReset={this.props.allowReset ?? true}
            allowReport={this.props.allowReport ?? true}
            errorCount={this.state.errorCount}
            isRecovering={this.state.isRecovering}
            recoveryAttempts={this.state.recoveryAttempts}
            uiState={uiState}
            theme={this.props.theme ?? "auto"}
            className={this.props.className}
          />
        </ErrorBoundaryContext.Provider>
      );
    }

    return children;
  }
}

// ============================================================================
// ERROR FALLBACK COMPONENT
// ============================================================================

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorContext,
  errorAnalysis,
  onReset,
  onReload,
  onReport,
  onRetryRecovery,
  showDetails,
  allowReset,
  allowReport,
  errorCount,
  isRecovering,
  recoveryAttempts,
  uiState,
  theme,
  className,
}) => {
  const [showReportDialog, setShowReportDialog] = React.useState(false);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusMessage = () => {
    switch (uiState) {
      case "recovering":
        return "正在尝试自动恢复...";
      case "recovered":
        return "恢复成功！页面即将重新加载...";
      case "failed":
        return "自动恢复失败，请手动处理。";
      default:
        return "应用程序遇到了意外错误。";
    }
  };

  const canAttemptRecovery = errorAnalysis?.category !== "critical" && recoveryAttempts < 3;

  return (
    <div className={`flex min-h-screen items-center justify-center bg-background p-4 ${className}`}>
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            {errorAnalysis ? (
              <div className="text-destructive">
                {errorAnalysis.category && (
                  <div className="h-8 w-8 flex items-center justify-center">
                    {(() => {
                      switch (errorAnalysis.category) {
                        case "network":
                          return <WifiOff className="h-8 w-8" />;
                        case "mobile":
                          return <Smartphone className="h-8 w-8" />;
                        case "performance":
                          return <Zap className="h-8 w-8" />;
                        case "audio":
                          return <HeadphonesIcon className="h-8 w-8" />;
                        default:
                          return <AlertTriangle className="h-8 w-8" />;
                      }
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="font-bold text-xl">出现了一个错误</CardTitle>
            <CardDescription className="text-base">{getStatusMessage()}</CardDescription>
            {errorCount > 1 && (
              <Badge variant="secondary" className="mt-2">
                第 {errorCount} 次错误
              </Badge>
            )}
            {errorAnalysis && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Badge className={getSeverityColor(errorAnalysis.severity)}>
                  {errorAnalysis.severity?.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {errorAnalysis.category?.toUpperCase()}
                </Badge>
                {errorAnalysis.type && (
                  <Badge variant="outline">
                    {errorAnalysis.type.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Actions */}
          <div className="flex flex-wrap gap-2">
            {allowReset && uiState !== "recovering" && (
              <Button onClick={onReset} variant="outline" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
            )}
            {canAttemptRecovery && uiState !== "recovering" && (
              <Button onClick={onRetryRecovery} className="flex-1">
                <Zap className="mr-2 h-4 w-4" />
                自动恢复
              </Button>
            )}
            <Button onClick={onReload} className="flex-1" disabled={isRecovering}>
              重新加载页面
            </Button>
            {allowReport && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReportDialog(true)}
              >
                <Bug className="mr-2 h-4 w-4" />
                报告问题
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
                <span className="text-blue-800">正在执行自动恢复...</span>
              </div>
            </div>
          )}

          {/* Recovery Success */}
          {uiState === "recovered" && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 text-green-600">✓</div>
                <span className="text-green-800">恢复成功！</span>
              </div>
            </div>
          )}

          {/* Recovery Failed */}
          {uiState === "failed" && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">
                  自动恢复失败 ({recoveryAttempts}/3)，请手动处理。
                </span>
              </div>
            </div>
          )}

          {/* Error Details */}
          {showDetails && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="mb-2 font-medium text-muted-foreground text-sm">
                        错误详情: {error.message}
                      </p>
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                            错误堆栈
                          </summary>
                          <pre className="mt-2 max-h-40 scrollable rounded-md bg-muted p-3 text-xs">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          JSON.stringify({
                            message: error.message,
                            stack: error.stack,
                            timestamp: new Date().toISOString(),
                            url: typeof window !== "undefined" ? window.location.href : "",
                          }, null, 2)
                        );
                      }}
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                      组件堆栈信息
                    </summary>
                    <pre className="mt-2 max-h-40 scrollable rounded-md bg-muted p-3 text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </>
          )}

          {/* Development Mode Info */}
          {process.env.NODE_ENV === "development" && (
            <>
              <Separator />
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                    开发模式
                  </Badge>
                  <span className="font-medium text-sm text-yellow-700">
                    详细的错误信息和分析结果
                  </span>
                </div>
                {errorAnalysis && (
                  <pre className="mt-2 max-h-60 scrollable rounded-md bg-yellow-100 p-3 text-xs text-yellow-900">
                    {JSON.stringify(errorAnalysis, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>报告错误</DialogTitle>
            <DialogDescription>
              您可以将错误信息发送给我们，帮助我们改进应用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={`错误信息：${error.message}
错误时间：${new Date().toLocaleString()}
页面URL：${typeof window !== "undefined" ? window.location.href : "N/A"}
浏览器信息：${typeof window !== "undefined" ? window.navigator.userAgent : "N/A"}
错误堆栈：${error.stack || "无"}
组件堆栈：${errorInfo?.componentStack || "无"}
错误分类：${errorAnalysis?.category || "未分类"}
严重程度：${errorAnalysis?.severity || "未知"}`}
              readOnly
              className="min-h-[300px] font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `错误信息：${error.message}\n错误时间：${new Date().toLocaleString()}\n页面URL：${typeof window !== "undefined" ? window.location.href : "N/A"}\n浏览器信息：${typeof window !== "undefined" ? window.navigator.userAgent : "N/A"}\n错误堆栈：${error.stack || "无"}\n组件堆栈：${errorInfo?.componentStack || "无"}\n错误分类：${errorAnalysis?.category || "未分类"}\n严重程度：${errorAnalysis?.severity || "未知"}`
                  );
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制错误信息
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// HOC AND CONVENIENCE FUNCTIONS
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Partial<ErrorBoundaryProps> = {}
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const ErrorBoundaryPresets = {
  // For critical application sections
  critical: {
    enableRecovery: true,
    showDetails: false,
    allowReset: false,
    allowReport: true,
    maxErrors: 3,
  },

  // For user-facing components
  userFacing: {
    enableRecovery: true,
    showDetails: false,
    allowReset: true,
    allowReport: true,
    maxErrors: 5,
  },

  // For development
  development: {
    enableRecovery: true,
    showDetails: true,
    allowReset: true,
    allowReport: false,
    maxErrors: 10,
  },

  // For mobile-optimized components
  mobile: {
    enableRecovery: true,
    showDetails: false,
    allowReset: true,
    allowReport: false,
    maxErrors: 3,
  },
};
