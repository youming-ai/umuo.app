/**
 * Comprehensive Error Display Components (T059)
 *
 * A comprehensive error message component system that provides user-friendly
 * error displays with clear recovery options, consistent visual design,
 * and integration with the error classification and recovery systems.
 *
 * Features:
 * - Multiple error display variants (inline, toast, modal, banner, full-page)
 * - Consistent visual design with theme support
 * - Mobile-optimized interactions and responsive design
 * - Accessibility compliance with WCAG 2.1
 * - Integration with error classification (T057) and recovery (T058)
 * - Progressive disclosure of technical details
 * - Actionable recovery steps with clear instructions
 */

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { z } from "zod";
import { cva, type VariantProps } from "class-variance-authority";

// Icon imports
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Bug,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Terminal,
  TriangleAlert,
  User,
  Wifi,
  WifiOff,
  X,
  Zap,
  ZapOff,
} from "lucide-react";

// UI component imports
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Utility and type imports
import { cn } from "@/lib/utils/utils";
import type { AppError } from "@/lib/utils/error-handler";
import {
  ErrorAnalysis,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  classifyError,
} from "@/lib/errors/error-classifier";
import {
  RecoveryActionType,
  RecoveryStatus,
  type RecoveryExecutionContext,
} from "@/lib/errors/recovery-strategies";

// ============================================================================
// TYPE DEFINITIONS AND INTERFACES
// ============================================================================

/**
 * Error display variants for different contexts
 */
export type ErrorDisplayVariant =
  | "inline"
  | "toast"
  | "modal"
  | "banner"
  | "full-page"
  | "compact"
  | "detailed";

/**
 * Error severity for visual styling
 */
export type ErrorSeverityLevel = "critical" | "high" | "medium" | "low" | "info";

/**
 * Error action configuration
 */
export interface ErrorAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
  destructive?: boolean;
}

/**
 * Error details configuration
 */
export interface ErrorDetails {
  title: string;
  description: string;
  technicalDetails?: string;
  errorCode?: string;
  timestamp?: Date;
  context?: Record<string, any>;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  helpLinks?: Array<{ label: string; url: string }>;
}

/**
 * Error context information
 */
export interface ErrorContextInfo {
  component?: string;
  action?: string;
  userJourney?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  networkType?: "wifi" | "cellular" | "unknown";
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  fileId?: number;
  jobId?: string;
}

/**
 * Main error display component props
 */
export interface ErrorDisplayProps {
  // Core error information
  error: AppError | Error | string;
  variant?: ErrorDisplayVariant;
  severity?: ErrorSeverityLevel;
  title?: string;
  description?: string;

  // Error analysis and classification
  analysis?: ErrorAnalysis;
  context?: ErrorContextInfo;

  // Actions and recovery
  actions?: ErrorAction[];
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  onReport?: (details: ErrorDetails) => void;

  // Display options
  showIcon?: boolean;
  showTimestamp?: boolean;
  showDetails?: boolean;
  expandableDetails?: boolean;
  dismissible?: boolean;
  persistent?: boolean;
  autoDismiss?: boolean;
  autoDismissDelay?: number;

  // Customization
  className?: string;
  icon?: React.ReactNode;
  customActions?: React.ReactNode;

  // Mobile-specific
  hapticFeedback?: boolean;
  mobileOptimized?: boolean;

  // Accessibility
  ariaLabel?: string;
  role?: string;

  // Children for custom content
  children?: React.ReactNode;
}

/**
 * Error icon component props
 */
export interface ErrorIconProps {
  severity: ErrorSeverityLevel;
  category?: ErrorCategory;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  custom?: React.ReactNode;
  animated?: boolean;
}

/**
 * Error actions component props
 */
export interface ErrorActionsProps {
  actions: ErrorAction[];
  layout?: "horizontal" | "vertical" | "stacked";
  maxVisible?: number;
  showMore?: boolean;
  className?: string;
  onActionClick?: (action: ErrorAction) => void;
}

/**
 * Error details component props
 */
export interface ErrorDetailsProps {
  details: ErrorDetails;
  expandable?: boolean;
  defaultExpanded?: boolean;
  showCopyButton?: boolean;
  showDownloadButton?: boolean;
  className?: string;
  onCopy?: (text: string) => void;
  onDownload?: (details: ErrorDetails) => void;
}

/**
 * Error context component props
 */
export interface ErrorContextProps {
  context: ErrorContextInfo;
  analysis?: ErrorAnalysis;
  compact?: boolean;
  showDevice?: boolean;
  showNetwork?: boolean;
  showPerformance?: boolean;
  className?: string;
}

// ============================================================================
// ERROR CONTEXT PROVIDER
// ============================================================================

/**
 * Error display context for global configuration
 */
interface ErrorDisplayContextType {
  globalConfig: {
    showTechnicalDetails: boolean;
    enableHapticFeedback: boolean;
    autoErrorReporting: boolean;
    defaultVariant: ErrorDisplayVariant;
  };
  updateConfig: (config: Partial<ErrorDisplayContextType["globalConfig"]>) => void;
  reportError: (details: ErrorDetails) => void;
  dismissError: (id: string) => void;
}

const ErrorDisplayContext = createContext<ErrorDisplayContextType | null>(null);

export function useErrorDisplay() {
  const context = useContext(ErrorDisplayContext);
  if (!context) {
    throw new Error("useErrorDisplay must be used within ErrorDisplayProvider");
  }
  return context;
}

export function ErrorDisplayProvider({
  children,
  defaultConfig = {},
}: {
  children: React.ReactNode;
  defaultConfig?: Partial<ErrorDisplayContextType["globalConfig"]>;
}) {
  const [globalConfig, setGlobalConfig] = useState({
    showTechnicalDetails: false,
    enableHapticFeedback: true,
    autoErrorReporting: false,
    defaultVariant: "toast" as ErrorDisplayVariant,
    ...defaultConfig,
  });

  const updateConfig = useCallback(
    (config: Partial<ErrorDisplayContextType["globalConfig"]>) => {
      setGlobalConfig((prev) => ({ ...prev, ...config }));
    },
    []
  );

  const reportError = useCallback((details: ErrorDetails) => {
    // Integrate with error reporting service
    console.log("Error reported:", details);
  }, []);

  const dismissError = useCallback((id: string) => {
    // Handle error dismissal
    console.log("Error dismissed:", id);
  }, []);

  const value = useMemo(
    () => ({
      globalConfig,
      updateConfig,
      reportError,
      dismissError,
    }),
    [globalConfig, updateConfig, reportError, dismissError]
  );

  return (
    <ErrorDisplayContext.Provider value={value}>
      {children}
    </ErrorDisplayContext.Provider>
  );
}

// ============================================================================
// UTILITY FUNCTIONS AND HOOKS
// ============================================================================

/**
 * Convert AppError severity to display severity
 */
function getDisplaySeverity(severity?: ErrorSeverity): ErrorSeverityLevel {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return "critical";
    case ErrorSeverity.HIGH:
      return "high";
    case ErrorSeverity.MEDIUM:
      return "medium";
    case ErrorSeverity.LOW:
      return "low";
    case ErrorSeverity.INFO:
      return "info";
    default:
      return "medium";
  }
}

/**
 * Get icon for error severity
 */
function getSeverityIcon(severity: ErrorSeverityLevel): React.ReactNode {
  switch (severity) {
    case "critical":
      return <AlertOctagon className="h-full w-full" />;
    case "high":
      return <AlertTriangle className="h-full w-full" />;
    case "medium":
      return <AlertCircle className="h-full w-full" />;
    case "low":
      return <Info className="h-full w-full" />;
    case "info":
      return <HelpCircle className="h-full w-full" />;
    default:
      return <AlertCircle className="h-full w-full" />;
  }
}

/**
 * Get category-specific icon
 */
function getCategoryIcon(category?: ErrorCategory): React.ReactNode {
  switch (category) {
    case ErrorCategory.NETWORK:
      return <WifiOff className="h-full w-full" />;
    case ErrorCategory.API:
      return <ShieldAlert className="h-full w-full" />;
    case ErrorCategory.FILE_SYSTEM:
      return <FileWarning className="h-full w-full" />;
    case ErrorCategory.AUDIO_PROCESSING:
      return <AlertTriangle className="h-full w-full" />;
    case ErrorCategory.TRANSCRIPTION:
      return <TriangleAlert className="h-full w-full" />;
    case ErrorCategory.AUTHENTICATION:
      return <Shield className="h-full w-full" />;
    case ErrorCategory.PERFORMANCE:
      return <ZapOff className="h-full w-full" />;
    case ErrorCategory.MEMORY:
      return <Bug className="h-full w-full" />;
    default:
      return <AlertCircle className="h-full w-full" />;
  }
}

/**
 * Generate default error actions based on analysis
 */
function generateDefaultActions(
  error: AppError | Error | string,
  analysis?: ErrorAnalysis,
  onRetry?: () => void | Promise<void>
): ErrorAction[] {
  const actions: ErrorAction[] = [];

  // Add retry action if applicable
  if (onRetry) {
    actions.push({
      id: "retry",
      label: "重试",
      description: "重新尝试操作",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onRetry,
      primary: true,
    });
  }

  // Add dismiss action
  actions.push({
    id: "dismiss",
    label: "关闭",
    description: "关闭错误消息",
    icon: <X className="h-4 w-4" />,
    variant: "ghost",
    onClick: () => {},
  });

  // Add specific actions based on error analysis
  if (analysis) {
    switch (analysis.recoveryStrategy) {
      case RecoveryStrategy.USER_INPUT_REQUIRED:
        actions.unshift({
          id: "provide-input",
          label: "提供所需信息",
          description: "完成所需输入以继续",
          icon: <User className="h-4 w-4" />,
          onClick: () => {},
          primary: true,
        });
        break;

      case RecoveryStrategy.REAUTHENTICATION:
        actions.unshift({
          id: "reauth",
          label: "重新登录",
          description: "需要重新验证身份",
          icon: <Shield className="h-4 w-4" />,
          onClick: () => {},
          primary: true,
        });
        break;

      case RecoveryStrategy.USER_ACTION_REQUIRED:
        actions.unshift({
          id: "user-action",
          label: "执行建议操作",
          description: analysis.recommendedActions[0] || "执行建议的操作",
          icon: <AlertTriangle className="h-4 w-4" />,
          onClick: () => {},
          primary: true,
        });
        break;
    }
  }

  return actions;
}

/**
 * Haptic feedback hook for mobile devices
 */
function useHapticFeedback() {
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
      if ("vibrate" in navigator) {
        switch (type) {
          case "light":
            navigator.vibrate(10);
            break;
          case "medium":
            navigator.vibrate(20);
            break;
          case "heavy":
            navigator.vibrate(30);
            break;
          case "success":
            navigator.vibrate([10, 50, 10]);
            break;
          case "warning":
            navigator.vibrate([20, 100, 20]);
            break;
          case "error":
            navigator.vibrate([30, 200, 30, 200, 30]);
            break;
        }
      }
    },
    []
  );

  return { triggerHaptic };
}

// ============================================================================
// COMPONENT VARIANTS AND STYLES
// ============================================================================

/**
 * Error display variants configuration
 */
const errorDisplayVariants = cva(
  "relative overflow-hidden rounded-lg border transition-all duration-200",
  {
    variants: {
      variant: {
        inline: "bg-background border-border shadow-sm",
        toast: "bg-background border-border shadow-lg",
        modal: "bg-background border-border shadow-xl",
        banner: "bg-background border-border shadow-md",
        "full-page": "bg-background border-border shadow-2xl",
        compact: "bg-background border-border shadow-xs",
        detailed: "bg-background border-border shadow-lg",
      },
      severity: {
        critical: "border-l-4 border-l-destructive",
        high: "border-l-4 border-l-orange-500",
        medium: "border-l-4 border-l-yellow-500",
        low: "border-l-4 border-l-blue-500",
        info: "border-l-4 border-l-info",
      },
    },
    defaultVariants: {
      variant: "inline",
      severity: "medium",
    },
  }
);

/**
 * Error icon variants
 */
const errorIconVariants = cva("flex-shrink-0", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },
    severity: {
      critical: "text-destructive",
      high: "text-orange-500",
      medium: "text-yellow-500",
      low: "text-blue-500",
      info: "text-info",
    },
    animated: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    severity: "medium",
    animated: false,
  },
});

// ============================================================================
// ERROR ICON COMPONENT
// ============================================================================

/**
 * ErrorIcon - Visual indicator for error severity and category
 */
export function ErrorIcon({
  severity,
  category,
  size = "md",
  className,
  custom,
  animated = false,
}: ErrorIconProps) {
  const icon = custom || getSeverityIcon(severity);

  return (
    <div
      className={cn(
        errorIconVariants({ size, severity, animated }),
        className
      )}
      role="img"
      aria-label={`${severity} severity icon`}
    >
      {icon}
    </div>
  );
}

// ============================================================================
// ERROR ACTIONS COMPONENT
// ============================================================================

/**
 * ErrorActions - Action buttons for error recovery
 */
export function ErrorActions({
  actions,
  layout = "horizontal",
  maxVisible = 3,
  showMore = true,
  className,
  onActionClick,
}: ErrorActionsProps) {
  const [showAllActions, setShowAllActions] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  const visibleActions = showAllActions
    ? actions
    : actions.slice(0, maxVisible);
  const hasMoreActions = actions.length > maxVisible;

  const handleActionClick = useCallback(
    async (action: ErrorAction) => {
      try {
        // Trigger haptic feedback on mobile
        triggerHaptic(action.destructive ? "error" : "light");

        // Call the action
        await action.onClick();

        // Notify parent
        onActionClick?.(action);
      } catch (error) {
        console.error("Error action failed:", error);
        triggerHaptic("error");
      }
    },
    [onActionClick, triggerHaptic]
  );

  if (actions.length === 0) {
    return null;
  }

  const layoutClasses = {
    horizontal: "flex flex-wrap gap-2",
    vertical: "flex flex-col gap-2",
    stacked: "flex flex-col sm:flex-row sm:justify-end gap-2",
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {visibleActions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || (action.primary ? "default" : "outline")}
          size="sm"
          onClick={() => handleActionClick(action)}
          disabled={action.disabled || action.loading}
          className={cn(
            "min-w-0 flex-1 sm:flex-none",
            action.destructive && "bg-destructive hover:bg-destructive/90"
          )}
        >
          {action.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            action.icon && <span className="mr-2 h-4 w-4">{action.icon}</span>
          )}
          <span className="truncate">{action.label}</span>
        </Button>
      ))}

      {hasMoreActions && showMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllActions(!showAllActions)}
          className="text-muted-foreground"
        >
          {showAllActions ? (
            <>
              <ChevronDown className="mr-1 h-4 w-4" />
              显示更少
            </>
          ) : (
            <>
              <ChevronRight className="mr-1 h-4 w-4" />
              更多 ({actions.length - maxVisible})
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// ERROR DETAILS COMPONENT
// ============================================================================

/**
 * ErrorDetails - Technical error information with progressive disclosure
 */
export function ErrorDetails({
  details,
  expandable = true,
  defaultExpanded = false,
  showCopyButton = true,
  showDownloadButton = false,
  className,
  onCopy,
  onDownload,
}: ErrorDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        onCopy?.(text);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    },
    [onCopy]
  );

  const handleDownload = useCallback(() => {
    const data = {
      title: details.title,
      description: details.description,
      technicalDetails: details.technicalDetails,
      errorCode: details.errorCode,
      timestamp: details.timestamp,
      context: details.context,
      stackTrace: details.stackTrace,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-${details.errorCode || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onDownload?.(details);
  }, [details, onDownload]);

  const detailsContent = (
    <div className="space-y-4">
      {/* Error Code and Timestamp */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {details.errorCode && (
          <div className="flex items-center gap-2">
            <span className="font-medium">错误代码:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {details.errorCode}
            </Badge>
          </div>
        )}
        {details.timestamp && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{details.timestamp.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Technical Details */}
      {details.technicalDetails && (
        <div>
          <h5 className="mb-2 font-medium text-sm">技术详情</h5>
          <div className="rounded-md bg-muted p-3">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
              {details.technicalDetails}
            </pre>
          </div>
        </div>
      )}

      {/* Context Information */}
      {details.context && Object.keys(details.context).length > 0 && (
        <div>
          <h5 className="mb-2 font-medium text-sm">上下文信息</h5>
          <div className="rounded-md bg-muted p-3">
            <dl className="space-y-1">
              {Object.entries(details.context).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <dt className="font-medium text-muted-foreground">{key}:</dt>
                  <dd className="font-mono text-right">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Stack Trace */}
      {details.stackTrace && (
        <div>
          <h5 className="mb-2 font-medium text-sm">堆栈跟踪</h5>
          <div className="rounded-md bg-muted p-3">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
              {details.stackTrace}
            </pre>
          </div>
        </div>
      )}

      {/* Help Links */}
      {details.helpLinks && details.helpLinks.length > 0 && (
        <div>
          <h5 className="mb-2 font-medium text-sm">帮助链接</h5>
          <div className="space-y-2">
            {details.helpLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        {showCopyButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(details.technicalDetails || details.description)}
            className="text-xs"
          >
            <Copy className="mr-1 h-3 w-3" />
            {copySuccess ? "已复制" : "复制"}
          </Button>
        )}
        {showDownloadButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            下载详情
          </Button>
        )}
      </div>
    </div>
  );

  if (!expandable) {
    return (
      <div className={cn("mt-4 border-t pt-4", className)}>
        {detailsContent}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <Terminal className="mr-2 h-4 w-4" />
          技术详情
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 border-t pt-4">
        {detailsContent}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// ERROR CONTEXT COMPONENT
// ============================================================================

/**
 * ErrorContext - Display error occurrence context information
 */
export function ErrorContext({
  context,
  analysis,
  compact = false,
  showDevice = true,
  showNetwork = true,
  showPerformance = false,
  className,
}: ErrorContextProps) {
  const contextItems = [];

  // Component context
  if (context.component) {
    contextItems.push({
      label: "组件",
      value: context.component,
      icon: <Bug className="h-3 w-3" />,
    });
  }

  // Action context
  if (context.action) {
    contextItems.push({
      label: "操作",
      value: context.action,
      icon: <Zap className="h-3 w-3" />,
    });
  }

  // Device information
  if (showDevice && context.deviceType) {
    contextItems.push({
      label: "设备",
      value: context.deviceType,
      icon: <Info className="h-3 w-3" />,
    });
  }

  // Network information
  if (showNetwork && context.networkType) {
    contextItems.push({
      label: "网络",
      value: context.networkType,
      icon:
        context.networkType === "wifi" ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        ),
    });
  }

  // File context
  if (context.fileId) {
    contextItems.push({
      label: "文件ID",
      value: `#${context.fileId}`,
      icon: <FileWarning className="h-3 w-3" />,
    });
  }

  // Job context
  if (context.jobId) {
    contextItems.push({
      label: "任务ID",
      value: context.jobId.substring(0, 8) + "...",
      icon: <Clock className="h-3 w-3" />,
    });
  }

  // Analysis-based context
  if (analysis) {
    if (analysis.userImpact.level !== "minimal") {
      contextItems.push({
        label: "影响级别",
        value: analysis.userImpact.level,
        icon: <AlertTriangle className="h-3 w-3" />,
      });
    }

    if (analysis.systemImpact.level !== "low") {
      contextItems.push({
        label: "系统影响",
        value: analysis.systemImpact.level,
        icon: <ShieldAlert className="h-3 w-3" />,
      });
    }
  }

  if (contextItems.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {contextItems.slice(0, 3).map((item, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            <span className="mr-1">{item.icon}</span>
            {item.label}: {item.value}
          </Badge>
        ))}
        {contextItems.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{contextItems.length - 3} 更多
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h5 className="font-medium text-sm">错误上下文</h5>
      <div className="grid gap-2 text-xs">
        {contextItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              {item.icon}
              <span>{item.label}:</span>
            </div>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ERROR DISPLAY COMPONENT
// ============================================================================

/**
 * ErrorMessage - Main comprehensive error display component
 */
export function ErrorMessage({
  error,
  variant = "inline",
  severity,
  title,
  description,
  analysis,
  context,
  actions: customActions,
  onRetry,
  onDismiss,
  onReport,
  showIcon = true,
  showTimestamp = true,
  showDetails = false,
  expandableDetails = true,
  dismissible = true,
  persistent = false,
  autoDismiss = false,
  autoDismissDelay = 8000,
  className,
  icon,
  customActions: customActionsElement,
  hapticFeedback = true,
  mobileOptimized = true,
  ariaLabel,
  role = "alert",
  children,
}: ErrorDisplayProps) {
  const { globalConfig, reportError } = useErrorDisplay();
  const [isVisible, setIsVisible] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  // Process error information
  const processedError = useMemo(() => {
    if (typeof error === "string") {
      return {
        message: error,
        code: "UNKNOWN",
        statusCode: undefined,
      } as AppError;
    }
    if (error instanceof Error) {
      return {
        message: error.message,
        code: "ERROR",
        statusCode: undefined,
        stack: error.stack,
      } as AppError;
    }
    return error as AppError;
  }, [error]);

  // Classify error if analysis not provided
  const errorAnalysis = useMemo(() => {
    if (analysis) return analysis;
    return classifyError(processedError, context);
  }, [analysis, processedError, context]);

  // Determine display severity
  const displaySeverity = severity || getDisplaySeverity(errorAnalysis.severity);

  // Generate title and description if not provided
  const displayTitle = title || errorAnalysis.userImpact.description || "发生错误";
  const displayDescription = description || processedError.message;

  // Generate default actions if not provided
  const defaultActions = useMemo(
    () => generateDefaultActions(processedError, errorAnalysis, onRetry),
    [processedError, errorAnalysis, onRetry]
  );

  const actions = customActions || defaultActions;

  // Generate error details
  const errorDetails: ErrorDetails = useMemo(
    () => ({
      title: displayTitle,
      description: displayDescription,
      technicalDetails: processedError.stack,
      errorCode: processedError.code,
      timestamp: new Date(),
      context: {
        ...context,
        analysis: errorAnalysis,
        severity: displaySeverity,
      },
      helpLinks: errorAnalysis.preventionStrategies.map((strategy, index) => ({
        label: `预防策略 ${index + 1}`,
        url: `#${strategy.replace(/\s+/g, "-")}`,
      })),
    }),
    [
      displayTitle,
      displayDescription,
      processedError,
      context,
      errorAnalysis,
      displaySeverity,
    ]
  );

  // Auto-dismiss logic
  useEffect(() => {
    if (autoDismiss && !persistent) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 200);
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, persistent, onDismiss]);

  // Haptic feedback
  useEffect(() => {
    if (hapticFeedback && mobileOptimized && globalConfig.enableHapticFeedback) {
      triggerHaptic(displaySeverity === "critical" || displaySeverity === "high" ? "error" : "warning");
    }
  }, [displaySeverity, hapticFeedback, mobileOptimized, globalConfig.enableHapticFeedback, triggerHaptic]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  const handleReport = useCallback(() => {
    reportError(errorDetails);
    onReport?.(errorDetails);
  }, [reportError, errorDetails, onReport]);

  if (!isVisible) {
    return null;
  }

  // Render different variants
  switch (variant) {
    case "toast":
      return (
        <Card className={cn(errorDisplayVariants({ variant, severity: displaySeverity }), className)}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {showIcon && (
                <ErrorIcon
                  severity={displaySeverity}
                  category={errorAnalysis.category}
                  size="md"
                  custom={icon}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {displayTitle}
                    </h4>
                    {displayDescription && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {displayDescription}
                      </p>
                    )}
                  </div>
                  {dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="ml-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {actions.length > 0 && (
                  <div className="mt-3">
                    <ErrorActions actions={actions} layout="horizontal" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "modal":
      return (
        <Dialog open={isVisible} onOpenChange={setIsVisible}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center space-x-3">
                {showIcon && (
                  <ErrorIcon
                    severity={displaySeverity}
                    category={errorAnalysis.category}
                    size="lg"
                    custom={icon}
                  />
                )}
                <div className="flex-1">
                  <DialogTitle className="text-lg">{displayTitle}</DialogTitle>
                  {displayDescription && (
                    <DialogDescription className="mt-1">
                      {displayDescription}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {children}

              {context && (
                <ErrorContext
                  context={context}
                  analysis={errorAnalysis}
                  compact={true}
                />
              )}

              {showDetails && (
                <ErrorDetails
                  details={errorDetails}
                  expandable={expandableDetails}
                />
              )}
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row">
              {actions.length > 0 && (
                <ErrorActions actions={actions} layout="horizontal" />
              )}
              {globalConfig.autoErrorReporting && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReport}
                  className="w-full sm:w-auto"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  报告错误
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

    case "banner":
      return (
        <div
          className={cn(
            errorDisplayVariants({ variant, severity: displaySeverity }),
            "border-x-0 border-t-0 rounded-none",
            className
          )}
          role={role}
          aria-label={ariaLabel}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {showIcon && (
                  <ErrorIcon
                    severity={displaySeverity}
                    category={errorAnalysis.category}
                    size="sm"
                    custom={icon}
                  />
                )}
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {displayTitle}
                  </h4>
                  {displayDescription && (
                    <p className="text-xs text-muted-foreground">
                      {displayDescription}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {actions.slice(0, 2).map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant || "ghost"}
                    size="sm"
                    onClick={action.onClick}
                    className="h-8 px-3 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
                {dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case "full-page":
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              {showIcon && (
                <div className="mx-auto mb-4">
                  <ErrorIcon
                    severity={displaySeverity}
                    category={errorAnalysis.category}
                    size="xl"
                    custom={icon}
                  />
                </div>
              )}
              <CardTitle className="text-2xl">{displayTitle}</CardTitle>
              {displayDescription && (
                <CardDescription className="text-base mt-2">
                  {displayDescription}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {children}

              {context && (
                <ErrorContext
                  context={context}
                  analysis={errorAnalysis}
                  showDevice={true}
                  showNetwork={true}
                />
              )}

              {showDetails && (
                <ErrorDetails
                  details={errorDetails}
                  expandable={expandableDetails}
                  showDownloadButton={true}
                />
              )}

              {customActionsElement}
            </CardContent>

            <CardFooter className="flex-col-reverse sm:flex-row gap-3">
              {actions.length > 0 && (
                <ErrorActions
                  actions={actions}
                  layout="stacked"
                  className="w-full sm:w-auto"
                />
              )}
              {globalConfig.autoErrorReporting && (
                <Button
                  variant="outline"
                  onClick={handleReport}
                  className="w-full sm:w-auto"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  报告错误
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      );

    case "compact":
      return (
        <div
          className={cn(
            errorDisplayVariants({ variant, severity: displaySeverity }),
            "p-2",
            className
          )}
          role={role}
          aria-label={ariaLabel}
        >
          <div className="flex items-center space-x-2">
            {showIcon && (
              <ErrorIcon
                severity={displaySeverity}
                category={errorAnalysis.category}
                size="sm"
                custom={icon}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {displayTitle}
              </p>
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      );

    case "detailed":
    case "inline":
    default:
      return (
        <Card
          className={cn(errorDisplayVariants({ variant, severity: displaySeverity }), className)}
          role={role}
          aria-label={ariaLabel}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start space-x-3">
              {showIcon && (
                <ErrorIcon
                  severity={displaySeverity}
                  category={errorAnalysis.category}
                  size="lg"
                  custom={icon}
                  animated={displaySeverity === "critical"}
                />
              )}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{displayTitle}</CardTitle>
                {displayDescription && (
                  <CardDescription className="mt-1 text-sm">
                    {displayDescription}
                  </CardDescription>
                )}
              </div>
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          {(children || context || showDetails) && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {children}

                {context && (
                  <ErrorContext
                    context={context}
                    analysis={errorAnalysis}
                    compact={variant === "inline"}
                  />
                )}

                {showDetails && (
                  <ErrorDetails
                    details={errorDetails}
                    expandable={expandableDetails}
                  />
                )}

                {customActionsElement}
              </div>
            </CardContent>
          )}

          {actions.length > 0 && (
            <CardFooter className="pt-3">
              <ErrorActions
                actions={actions}
                layout={variant === "detailed" ? "vertical" : "horizontal"}
                className="w-full"
              />
            </CardFooter>
          )}
        </Card>
      );
  }
}

// ============================================================================
// SPECIALIZED ERROR COMPONENTS
// ============================================================================

/**
 * NetworkErrorDisplay - Specialized component for network errors
 */
export function NetworkErrorDisplay({
  error,
  onRetry,
  onDismiss,
  ...props
}: Omit<ErrorDisplayProps, "error" | "variant"> & {
  error: AppError | Error;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
}) {
  const networkActions: ErrorAction[] = [
    {
      id: "retry",
      label: "重试",
      description: "重新尝试网络请求",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onRetry || (() => {}),
      primary: true,
    },
    {
      id: "check-connection",
      label: "检查网络",
      description: "测试网络连接",
      icon: <Wifi className="h-4 w-4" />,
      onClick: () => {
        // Check network connectivity
        if (navigator.onLine) {
          alert("网络连接正常");
        } else {
          alert("网络连接已断开");
        }
      },
    },
  ];

  return (
    <ErrorMessage
      error={error}
      variant="banner"
      severity="high"
      title="网络连接错误"
      description="无法连接到服务器，请检查您的网络连接"
      actions={networkActions}
      onDismiss={onDismiss}
      {...props}
    />
  );
}

/**
 * ValidationErrorDisplay - Specialized component for validation errors
 */
export function ValidationErrorDisplay({
  error,
  fieldName,
  onFix,
  onDismiss,
  ...props
}: Omit<ErrorDisplayProps, "error" | "variant"> & {
  error: AppError | Error;
  fieldName?: string;
  onFix?: () => void | Promise<void>;
  onDismiss?: () => void;
}) {
  const validationActions: ErrorAction[] = [
    {
      id: "fix",
      label: "修复",
      description: "修正输入错误",
      icon: <AlertTriangle className="h-4 w-4" />,
      onClick: onFix || (() => {}),
      primary: true,
    },
  ];

  const title = fieldName ? `${fieldName} 验证失败` : "输入验证错误";
  const description = error.message || "请检查您的输入并修正错误";

  return (
    <ErrorMessage
      error={error}
      variant="inline"
      severity="medium"
      title={title}
      description={description}
      actions={validationActions}
      onDismiss={onDismiss}
      {...props}
    />
  );
}

/**
 * CriticalErrorDisplay - Specialized component for critical errors
 */
export function CriticalErrorDisplay({
  error,
  onRecover,
  onReport,
  ...props
}: Omit<ErrorDisplayProps, "error" | "variant"> & {
  error: AppError | Error;
  onRecover?: () => void | Promise<void>;
  onReport?: (details: ErrorDetails) => void;
}) {
  const criticalActions: ErrorAction[] = [
    {
      id: "recover",
      label: "尝试恢复",
      description: "尝试恢复系统功能",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: onRecover || (() => {}),
      primary: true,
      destructive: true,
    },
    {
      id: "report",
      label: "报告错误",
      description: "向技术团队报告此问题",
      icon: <Bug className="h-4 w-4" />,
      onClick: () => onReport?.({} as ErrorDetails),
    },
  ];

  return (
    <ErrorMessage
      error={error}
      variant="full-page"
      severity="critical"
      title="系统严重错误"
      description="发生了严重的系统错误，应用可能无法正常工作"
      actions={criticalActions}
      showDetails={true}
      showTimestamp={true}
      persistent={true}
      {...props}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ErrorAction,
  ErrorDetails,
  ErrorContextInfo,
  ErrorDisplayProps,
  ErrorIconProps,
  ErrorActionsProps,
  ErrorDetailsProps,
  ErrorContextProps,
};

export {
  ErrorDisplayProvider,
  useErrorDisplay,
  ErrorIcon,
  ErrorActions,
  ErrorDetails,
  ErrorContext,
  ErrorMessage as default,
};

// Default export for convenience
export default ErrorMessage;
