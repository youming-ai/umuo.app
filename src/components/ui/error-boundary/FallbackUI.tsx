"use client";

import React, { ReactNode } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Settings,
  Download,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  SmartPhone,
  Monitor,
  Zap,
  FileText,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  Mail,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FallbackUIProps {
  type: FallbackType;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: FallbackAction[];
  details?: FallbackDetails;
  suggestions?: string[];
  metadata?: Record<string, any>;
  className?: string;
  compact?: boolean;
  theme?: "light" | "dark" | "auto";
}

export type FallbackType =
  | "error"
  | "network"
  | "offline"
  | "mobile"
  | "performance"
  | "transcription"
  | "audio"
  | "player"
  | "upload"
  | "auth"
  | "maintenance"
  | "feature-unavailable"
  | "browser-incompatible";

export interface FallbackAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
}

export interface FallbackDetails {
  error?: Error;
  errorCode?: string;
  timestamp?: number;
  context?: Record<string, any>;
  technicalDetails?: Record<string, any>;
  stackTrace?: string;
}

// ============================================================================
// BASE FALLBACK UI COMPONENT
// ============================================================================

export const FallbackUI: React.FC<FallbackUIProps> = ({
  type,
  title,
  description,
  icon,
  actions = [],
  details,
  suggestions = [],
  metadata,
  className = "",
  compact = false,
  theme = "auto",
}) => {
  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return "bg-white text-gray-900 border-gray-200";
      case "dark":
        return "bg-gray-900 text-gray-100 border-gray-700";
      default:
        return "bg-background text-foreground border-border";
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case "network":
      case "offline":
        return <WifiOff className="h-6 w-6" />;
      case "mobile":
        return <SmartPhone className="h-6 w-6" />;
      case "performance":
        return <Zap className="h-6 w-6" />;
      case "transcription":
        return <FileText className="h-6 w-6" />;
      case "audio":
      case "player":
        return <VolumeX className="h-6 w-6" />;
      case "upload":
        return <Download className="h-6 w-6" />;
      case "auth":
        return <AlertTriangle className="h-6 w-6" />;
      case "maintenance":
        return <Settings className="h-6 w-6" />;
      default:
        return <AlertTriangle className="h-6 w-6" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case "network":
      case "offline":
        return "text-orange-500";
      case "mobile":
        return "text-blue-500";
      case "performance":
        return "text-yellow-500";
      case "transcription":
      case "audio":
      case "player":
        return "text-red-500";
      case "upload":
        return "text-purple-500";
      case "auth":
        return "text-red-600";
      case "maintenance":
        return "text-gray-500";
      default:
        return "text-destructive";
    }
  };

  if (compact) {
    return (
      <Card className={`w-full max-w-md ${getThemeClasses()} ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${getTypeColor()}`}>
              {icon || getDefaultIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <p className="text-muted-foreground text-xs truncate">{description}</p>
            </div>
          </div>

          {actions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {actions.filter(action => action.primary).map(action => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="flex-1"
                >
                  {action.loading && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-2xl ${getThemeClasses()} ${className}`}>
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ${getTypeColor()}`}>
            {icon || getDefaultIcon()}
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </div>
          <Badge variant={type === "maintenance" ? "secondary" : "destructive"}>
            {type.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Actions */}
        {actions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map(action => (
              <Button
                key={action.id}
                variant={action.variant}
                onClick={action.onClick}
                disabled={action.disabled}
                className={action.primary ? "col-span-2 sm:col-span-1" : ""}
              >
                {action.loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">建议的解决方案：</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Details */}
        {details && process.env.NODE_ENV === "development" && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">技术详情：</h4>
              <div className="rounded-md bg-muted p-3">
                <div className="space-y-2 text-xs">
                  {details.errorCode && (
                    <div>
                      <span className="font-medium">错误代码:</span> {details.errorCode}
                    </div>
                  )}
                  {details.timestamp && (
                    <div>
                      <span className="font-medium">时间:</span> {new Date(details.timestamp).toLocaleString()}
                    </div>
                  )}
                  {details.error && (
                    <div>
                      <span className="font-medium">错误信息:</span> {details.error.message}
                    </div>
                  )}
                  {details.stackTrace && (
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:text-foreground">
                        查看堆栈信息
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto text-xs bg-background p-2 rounded">
                        {details.stackTrace}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Support Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <SupportDialog type="help" />
          <SupportDialog type="feedback" />
          <SupportDialog type="contact" />
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// SPECIALIZED FALLBACK COMPONENTS
// ============================================================================

export const NetworkErrorFallback: React.FC<{
  onRetry?: () => void;
  onOfflineMode?: () => void;
  onCheckConnection?: () => void;
}> = ({ onRetry, onOfflineMode, onCheckConnection }) => (
  <FallbackUI
    type="network"
    title="网络连接问题"
    description="无法连接到服务器，请检查您的网络连接。"
    actions={[
      {
        id: "retry",
        label: "重试",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: onRetry || (() => window.location.reload()),
        primary: true,
      },
      {
        id: "offline",
        label: "离线模式",
        icon: <WifiOff className="h-4 w-4" />,
        onClick: onOfflineMode || (() => {}),
        variant: "outline",
      },
      {
        id: "check",
        label: "检查连接",
        icon: <Wifi className="h-4 w-4" />,
        onClick: onCheckConnection || (() => window.location.reload()),
        variant: "outline",
      },
    ]}
    suggestions={[
      "检查您的网络连接是否正常",
      "尝试切换到其他网络（WiFi/移动数据）",
      "检查防火墙或VPN设置",
      "等待几分钟后重试",
    ]}
  />
);

export const AudioPlayerFallback: React.FC<{
  fileName?: string;
  onRetry?: () => void;
  onDownload?: () => void;
  onFallbackMode?: () => void;
}> = ({ fileName, onRetry, onDownload, onFallbackMode }) => (
  <FallbackUI
    type="player"
    title="音频播放错误"
    description="无法播放音频文件，可能是文件格式不支持或网络连接问题。"
    icon={<VolumeX className="h-6 w-6" />}
    actions={[
      {
        id: "retry",
        label: "重试播放",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: onRetry || (() => {}),
        primary: true,
      },
      {
        id: "fallback",
        label: "备用播放器",
        icon: <Play className="h-4 w-4" />,
        onClick: onFallbackMode || (() => {}),
        variant: "outline",
      },
      {
        id: "download",
        label: "下载文件",
        icon: <Download className="h-4 w-4" />,
        onClick: onDownload || (() => {}),
        variant: "outline",
      },
    ]}
    details={{
      ...(fileName && { context: { fileName } }),
    }}
    suggestions={[
      "检查音频文件格式是否支持",
      "确认音频文件没有损坏",
      "尝试刷新页面",
      "检查浏览器音频权限",
    ]}
  />
);

export const TranscriptionFallback: React.FC<{
  fileName?: string;
  progress?: number;
  onRetry?: () => void;
  onFallback?: () => void;
  onDownload?: () => void;
}> = ({ fileName, progress, onRetry, onFallback, onDownload }) => (
  <FallbackUI
    type="transcription"
    title="转录处理错误"
    description="音频转录过程中出现问题，可能是网络连接或服务暂时不可用。"
    icon={<FileText className="h-6 w-6" />}
    actions={[
      {
        id: "retry",
        label: "重试转录",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: onRetry || (() => {}),
        primary: true,
      },
      {
        id: "fallback",
        label: "备用转录",
        icon: <ChevronRight className="h-4 w-4" />,
        onClick: onFallback || (() => {}),
        variant: "outline",
      },
      {
        id: "download",
        label: "下载原文",
        icon: <Download className="h-4 w-4" />,
        onClick: onDownload || (() => {}),
        variant: "outline",
      },
    ]}
    details={{
      ...(fileName && { context: { fileName } }),
      ...(progress !== undefined && { context: { progress } }),
    }}
    suggestions={[
      "检查网络连接是否稳定",
      "尝试重新上传文件",
      "使用备用转录服务",
      "转换音频格式后重试",
    ]}
  >
    {progress !== undefined && (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>转录进度</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    )}
  </FallbackUI>
);

export const MobileErrorFallback: React.FC<{
  onRetry?: () => void;
  onSettings?: () => void;
  batteryLevel?: number;
  connectionType?: string;
}> = ({ onRetry, onSettings, batteryLevel, connectionType }) => (
  <FallbackUI
    type="mobile"
    title="移动设备错误"
    description="移动应用遇到问题，可能是网络连接或设备性能问题。"
    icon={<SmartPhone className="h-6 w-6" />}
    actions={[
      {
        id: "retry",
        label: "重试",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: onRetry || (() => {}),
        primary: true,
      },
      {
        id: "settings",
        label: "设置",
        icon: <Settings className="h-4 w-4" />,
        onClick: onSettings || (() => {}),
        variant: "outline",
      },
    ]}
    metadata={{ batteryLevel, connectionType }}
    suggestions={[
      "检查网络连接稳定性",
      "确保设备有足够电量",
      "关闭其他应用程序",
      "重启应用程序",
    ]}
  />
);

export const PerformanceErrorFallback: React.FC<{
  metrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    fps?: number;
  };
  onOptimize?: () => void;
  onReset?: () => void;
}> = ({ metrics, onOptimize, onReset }) => (
  <FallbackUI
    type="performance"
    title="性能问题"
    description="应用性能超出预期阈值，可能影响使用体验。"
    icon={<Zap className="h-6 w-6" />}
    actions={[
      {
        id: "optimize",
        label: "优化性能",
        icon: <Zap className="h-4 w-4" />,
        onClick: onOptimize || (() => {}),
        primary: true,
      },
      {
        id: "reset",
        label: "重置",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: onReset || (() => {}),
        variant: "outline",
      },
    ]}
    details={{
      technicalDetails: metrics,
    }}
    suggestions={[
      "关闭其他浏览器标签页",
      "清理浏览器缓存",
      "降低画质或性能设置",
      "重启浏览器",
    ]}
  />
);

export const MaintenanceFallback: React.FC<{
  estimatedTime?: string;
  onNotify?: () => void;
}> = ({ estimatedTime, onNotify }) => (
  <FallbackUI
    type="maintenance"
    title="系统维护中"
    description={`我们正在升级系统以提供更好的服务。${estimatedTime ? `预计需要 ${estimatedTime}。` : ''}`}
    icon={<Settings className="h-6 w-6" />}
    actions={[
      {
        id: "notify",
        label: "完成时通知我",
        icon: <Clock className="h-4 w-4" />,
        onClick: onNotify || (() => {}),
        variant: "outline",
      },
    ]}
    suggestions={[
      "请稍后再试",
      "关注我们的社交媒体获取更新",
      "保存您的工作进度",
    ]}
  />
);

export const BrowserIncompatibleFallback: React.FC<{
  onUpgrade?: () => void;
  onContinueAnyway?: () => void;
}> = ({ onUpgrade, onContinueAnyway }) => (
  <FallbackUI
    type="browser-incompatible"
    title="浏览器不兼容"
    description="您的浏览器版本过低，可能无法正常使用所有功能。"
    icon={<AlertTriangle className="h-6 w-6" />}
    actions={[
      {
        id: "upgrade",
        label: "升级浏览器",
        icon: <ExternalLink className="h-4 w-4" />,
        onClick: onUpgrade || (() => window.open("https://browsehappy.com/", "_blank")),
        primary: true,
      },
      {
        id: "continue",
        label: "继续使用",
        onClick: onContinueAnyway || (() => {}),
        variant: "outline",
      },
    ]}
    suggestions={[
      "推荐使用最新版本的 Chrome、Firefox、Safari 或 Edge",
      "升级浏览器以获得更好的安全性和性能",
      "移动设备建议使用原生浏览器",
    ]}
  />
);

// ============================================================================
// SUPPORT DIALOG COMPONENT
// ============================================================================

interface SupportDialogProps {
  type: "help" | "feedback" | "contact";
}

const SupportDialog: React.FC<SupportDialogProps> = ({ type }) => {
  const getDialogContent = () => {
    switch (type) {
      case "help":
        return {
          title: "帮助中心",
          description: "查看常见问题和解决方案",
          icon: <HelpCircle className="h-4 w-4" />,
          label: "帮助",
          content: (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                请访问我们的帮助中心获取详细的使用指南和常见问题解答。
              </div>
              <Button
                className="w-full"
                onClick={() => window.open("/help", "_blank")}
              >
                访问帮助中心
              </Button>
            </div>
          ),
        };
      case "feedback":
        return {
          title: "意见反馈",
          description: "帮助我们改进产品和服务",
          icon: <MessageCircle className="h-4 w-4" />,
          label: "反馈",
          content: <FeedbackForm />,
        };
      case "contact":
        return {
          title: "联系我们",
          description: "获取技术支持和客户服务",
          icon: <Mail className="h-4 w-4" />,
          label: "联系",
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="text-sm">
                  <strong>邮箱:</strong> support@umuo.app
                </div>
                <div className="text-sm">
                  <strong>工作时间:</strong> 周一至周五 9:00-18:00
                </div>
              </div>
              <Button className="w-full" variant="outline">
                发送邮件
              </Button>
            </div>
          ),
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {dialogContent.icon}
          <span className="ml-2 hidden sm:inline">{dialogContent.label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogContent.title}</DialogTitle>
          <DialogDescription>{dialogContent.description}</DialogDescription>
        </DialogHeader>
        {dialogContent.content}
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// FEEDBACK FORM COMPONENT
// ============================================================================

const FeedbackForm: React.FC = () => {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle feedback submission
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">感谢您的反馈！</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="type">反馈类型</Label>
          <Select required>
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">错误报告</SelectItem>
              <SelectItem value="feature">功能建议</SelectItem>
              <SelectItem value="improvement">改进意见</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">优先级</Label>
          <Select required>
            <SelectTrigger>
              <SelectValue placeholder="选择优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="critical">紧急</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="subject">主题</Label>
        <Input id="subject" placeholder="简要描述问题或建议" required />
      </div>

      <div>
        <Label htmlFor="description">详细描述</Label>
        <Textarea
          id="description"
          placeholder="请详细描述您遇到的问题或建议..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">邮箱（可选）</Label>
        <Input
          id="email"
          type="email"
          placeholder="如需回复请留下邮箱"
        />
      </div>

      <Button type="submit" className="w-full">
        提交反馈
      </Button>
    </form>
  );
};

// ============================================================================
// MINIMAL FALLBACK COMPONENT
// ============================================================================

export const MinimalFallback: React.FC<{
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ message, action }) => (
  <div className="flex items-center justify-center p-4">
    <div className="text-center space-y-3">
      <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  </div>
);

// ============================================================================
// LOADING FALLBACK COMPONENT
// ============================================================================

export const LoadingFallback: React.FC<{
  message?: string;
  progress?: number;
}> = ({ message = "加载中...", progress }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4">
      <div className="animate-spin">
        <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {progress !== undefined && (
        <div className="w-48 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>进度</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  </div>
);
