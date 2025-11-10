"use client";

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from "react";
import {
  AlertTriangle,
  Bug,
  Wifi,
  WifiOff,
  HardDrive,
  MemoryStick,
  Zap,
  Clock,
  Shield,
  Network,
  FileText,
  Smartphone,
  Monitor
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorClassifier, type ErrorCategory, type ErrorSeverity, type ErrorType } from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ErrorClassificationConfig {
  enableAutoClassification: boolean;
  enablePatternRecognition: boolean;
  enablePredictiveAnalysis: boolean;
  enableCustomCategories: boolean;
  customCategories?: CustomErrorCategory[];
}

export interface CustomErrorCategory {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  severity: ErrorSeverity;
  patterns: RegExp[];
  recoveryStrategies: string[];
}

export interface ClassifiedError {
  id: string;
  error: Error;
  category: ErrorCategory;
  type: ErrorType;
  severity: ErrorSeverity;
  confidence: number;
  patterns: string[];
  suggestions: string[];
  recoveryStrategies: string[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface ErrorClassificationContextType {
  config: ErrorClassificationConfig;
  classifyError: (error: Error, context?: any) => ClassifiedError;
  getCategoryInfo: (category: ErrorCategory) => CategoryInfo;
  getTypeInfo: (type: ErrorType) => TypeInfo;
  getSeverityInfo: (severity: ErrorSeverity) => SeverityInfo;
  updateConfig: (config: Partial<ErrorClassificationConfig>) => void;
  addCustomCategory: (category: CustomErrorCategory) => void;
  removeCustomCategory: (categoryId: string) => void;
}

interface CategoryInfo {
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  commonCauses: string[];
  solutions: string[];
}

interface TypeInfo {
  name: string;
  description: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  preventable: boolean;
}

interface SeverityInfo {
  name: string;
  description: string;
  color: string;
  level: number;
  requiresAttention: boolean;
  autoRecovery: boolean;
}

// ============================================================================
// ERROR CLASSIFICATION CONTEXT
// ============================================================================

const ErrorClassificationContext = createContext<ErrorClassificationContextType | null>(null);

export const useErrorClassification = () => {
  const context = useContext(ErrorClassificationContext);
  if (!context) {
    throw new Error("useErrorClassification must be used within an ErrorClassificationProvider");
  }
  return context;
};

// ============================================================================
// ERROR CLASSIFICATION PROVIDER
// ============================================================================

export const ErrorClassificationProvider: React.FC<{
  children: ReactNode;
  config?: Partial<ErrorClassificationConfig>;
}> = ({ children, config: initialConfig = {} }) => {
  const defaultConfig: ErrorClassificationConfig = {
    enableAutoClassification: true,
    enablePatternRecognition: true,
    enablePredictiveAnalysis: true,
    enableCustomCategories: false,
    customCategories: [],
    ...initialConfig,
  };

  const [config, setConfig] = React.useState<ErrorClassificationConfig>(defaultConfig);
  const [customCategories, setCustomCategories] = React.useState<CustomErrorCategory[]>(defaultConfig.customCategories || []);

  const errorClassifier = useMemo(() => ErrorClassifier.getInstance(), []);

  const classifyError = useCallback((error: Error, context?: any): ClassifiedError => {
    if (!config.enableAutoClassification) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        error,
        category: "unknown",
        type: "UnknownError",
        severity: "medium",
        confidence: 0,
        patterns: [],
        suggestions: [],
        recoveryStrategies: [],
        metadata: {},
        timestamp: Date.now(),
      };
    }

    // Use the existing ErrorClassifier for classification
    const analysis = errorClassifier.analyzeError(error, {
      timestamp: new Date().toISOString(),
      ...context,
    });

    // Check custom categories if enabled
    let matchedCustomCategory: CustomErrorCategory | null = null;
    if (config.enableCustomCategories && customCategories.length > 0) {
      matchedCustomCategory = customCategories.find(category =>
        category.patterns.some(pattern => pattern.test(error.message))
      );
    }

    // Apply custom category if found
    if (matchedCustomCategory) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        error,
        category: matchedCustomCategory.id as ErrorCategory,
        type: "CustomError",
        severity: matchedCustomCategory.severity,
        confidence: 0.9,
        patterns: matchedCustomCategory.patterns.map(p => p.toString()),
        suggestions: [matchedCustomCategory.description],
        recoveryStrategies: matchedCustomCategory.recoveryStrategies,
        metadata: {
          customCategory: true,
          categoryId: matchedCustomCategory.id,
        },
        timestamp: Date.now(),
      };
    }

    // Use standard classification
    return {
      id: Math.random().toString(36).substr(2, 9),
      error,
      category: analysis.category,
      type: analysis.type as ErrorType,
      severity: analysis.severity,
      confidence: 0.8,
      patterns: analysis.patterns || [],
      suggestions: analysis.suggestions || [],
      recoveryStrategies: analysis.recoveryStrategies || [],
      metadata: analysis.metadata || {},
      timestamp: Date.now(),
    };
  }, [config, customCategories, errorClassifier]);

  const getCategoryInfo = useCallback((category: ErrorCategory): CategoryInfo => {
    // Check if it's a custom category
    const customCategory = customCategories.find(c => c.id === category);
    if (customCategory) {
      return {
        name: customCategory.name,
        description: customCategory.description,
        icon: customCategory.icon,
        color: customCategory.color,
        commonCauses: [],
        solutions: customCategory.recoveryStrategies,
      };
    }

    // Standard category info
    const categoryInfoMap: Record<ErrorCategory, CategoryInfo> = {
      network: {
        name: "网络错误",
        description: "与网络连接、API调用或数据传输相关的错误",
        icon: <WifiOff className="h-4 w-4" />,
        color: "text-orange-500",
        commonCauses: ["网络连接断开", "API服务不可用", "请求超时", "DNS解析失败"],
        solutions: ["检查网络连接", "重试请求", "使用离线模式", "联系技术支持"],
      },
      transcription: {
        name: "转录错误",
        description: "音频转录和处理过程中的错误",
        icon: <FileText className="h-4 w-4" />,
        color: "text-red-500",
        commonCauses: ["音频格式不支持", "文件损坏", "转录服务不可用", "处理超时"],
        solutions: ["检查音频格式", "重新上传文件", "使用备用转录服务", "减小文件大小"],
      },
      audio: {
        name: "音频错误",
        description: "音频播放和录制相关的错误",
        icon: <Monitor className="h-4 w-4" />,
        color: "text-purple-500",
        commonCauses: ["音频设备不可用", "格式不支持", "权限被拒绝", "播放器错误"],
        solutions: ["检查音频设备", "转换音频格式", "检查浏览器权限", "刷新页面"],
      },
      mobile: {
        name: "移动端错误",
        description: "移动设备特有的错误和兼容性问题",
        icon: <Smartphone className="h-4 w-4" />,
        color: "text-blue-500",
        commonCauses: ["触摸事件冲突", "设备性能不足", "网络不稳定", "浏览器兼容性"],
        solutions: ["优化触摸交互", "降低性能要求", "启用离线模式", "更新浏览器"],
      },
      performance: {
        name: "性能错误",
        description: "应用性能问题导致的错误",
        icon: <Zap className="h-4 w-4" />,
        color: "text-yellow-500",
        commonCauses: ["内存使用过高", "CPU使用率过高", "帧率过低", "加载时间过长"],
        solutions: ["关闭其他应用", "优化代码", "清理缓存", "降低画质设置"],
      },
      storage: {
        name: "存储错误",
        description: "数据存储和读取相关的错误",
        icon: <HardDrive className="h-4 w-4" />,
        color: "text-green-500",
        commonCauses: ["存储空间不足", "数据库损坏", "权限问题", "数据格式错误"],
        solutions: ["清理存储空间", "重新初始化数据库", "检查权限", "修复数据格式"],
      },
      validation: {
        name: "验证错误",
        description: "数据验证和格式检查相关的错误",
        icon: <Shield className="h-4 w-4" />,
        color: "text-indigo-500",
        commonCauses: ["输入格式错误", "数据类型不匹配", "必填字段缺失", "验证规则冲突"],
        solutions: ["检查输入格式", "确认必填字段", "更新验证规则", "联系技术支持"],
      },
      authentication: {
        name: "认证错误",
        description: "用户认证和授权相关的错误",
        icon: <Shield className="h-4 w-4" />,
        color: "text-red-600",
        commonCauses: ["登录凭据错误", "会话过期", "权限不足", "账户被锁定"],
        solutions: ["重新登录", "检查账户状态", "联系管理员", "重置密码"],
      },
      unknown: {
        name: "未知错误",
        description: "无法分类的未知错误类型",
        icon: <Bug className="h-4 w-4" />,
        color: "text-gray-500",
        commonCauses: ["系统内部错误", "第三方库错误", "浏览器兼容性", "未处理的异常"],
        solutions: ["刷新页面", "检查浏览器更新", "联系技术支持", "查看控制台日志"],
      },
    };

    return categoryInfoMap[category] || categoryInfoMap.unknown;
  }, [customCategories]);

  const getTypeInfo = useCallback((type: ErrorType): TypeInfo => {
    const typeInfoMap: Record<ErrorType, TypeInfo> = {
      NetworkError: {
        name: "网络错误",
        description: "网络连接或通信失败",
        category: "network",
        severity: "high",
        recoverable: true,
        preventable: true,
      },
      TimeoutError: {
        name: "超时错误",
        description: "操作执行时间超过限制",
        category: "network",
        severity: "medium",
        recoverable: true,
        preventable: true,
      },
      ValidationError: {
        name: "验证错误",
        description: "数据验证失败",
        category: "validation",
        severity: "low",
        recoverable: true,
        preventable: true,
      },
      AuthenticationError: {
        name: "认证错误",
        description: "用户认证失败",
        category: "authentication",
        severity: "high",
        recoverable: true,
        preventable: false,
      },
      PermissionError: {
        name: "权限错误",
        description: "操作权限不足",
        category: "authentication",
        severity: "medium",
        recoverable: true,
        preventable: false,
      },
      StorageError: {
        name: "存储错误",
        description: "数据存储操作失败",
        category: "storage",
        severity: "high",
        recoverable: true,
        preventable: true,
      },
      AudioError: {
        name: "音频错误",
        description: "音频处理失败",
        category: "audio",
        severity: "medium",
        recoverable: true,
        preventable: true,
      },
      TranscriptionError: {
        name: "转录错误",
        description: "音频转录失败",
        category: "transcription",
        severity: "high",
        recoverable: true,
        preventable: true,
      },
      MobileError: {
        name: "移动端错误",
        description: "移动设备特定错误",
        category: "mobile",
        severity: "medium",
        recoverable: true,
        preventable: true,
      },
      PerformanceError: {
        name: "性能错误",
        description: "性能指标超出阈值",
        category: "performance",
        severity: "medium",
        recoverable: true,
        preventable: true,
      },
      UnknownError: {
        name: "未知错误",
        description: "无法识别的错误类型",
        category: "unknown",
        severity: "medium",
        recoverable: false,
        preventable: false,
      },
      CustomError: {
        name: "自定义错误",
        description: "用户定义的错误类型",
        category: "unknown",
        severity: "medium",
        recoverable: true,
        preventable: true,
      },
    };

    return typeInfoMap[type] || typeInfoMap.UnknownError;
  }, []);

  const getSeverityInfo = useCallback((severity: ErrorSeverity): SeverityInfo => {
    const severityInfoMap: Record<ErrorSeverity, SeverityInfo> = {
      low: {
        name: "低严重性",
        description: "轻微问题，不影响核心功能",
        color: "text-green-500",
        level: 1,
        requiresAttention: false,
        autoRecovery: true,
      },
      medium: {
        name: "中等严重性",
        description: "影响部分功能，但可以继续使用",
        color: "text-yellow-500",
        level: 2,
        requiresAttention: true,
        autoRecovery: true,
      },
      high: {
        name: "高严重性",
        description: "严重影响使用体验，需要立即处理",
        color: "text-orange-500",
        level: 3,
        requiresAttention: true,
        autoRecovery: false,
      },
      critical: {
        name: "严重错误",
        description: "系统无法正常使用，需要紧急修复",
        color: "text-red-500",
        level: 4,
        requiresAttention: true,
        autoRecovery: false,
      },
    };

    return severityInfoMap[severity] || severityInfoMap.medium;
  }, []);

  const updateConfig = useCallback((newConfig: Partial<ErrorClassificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const addCustomCategory = useCallback((category: CustomErrorCategory) => {
    setCustomCategories(prev => [...prev, category]);
  }, []);

  const removeCustomCategory = useCallback((categoryId: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
  }, []);

  const contextValue: ErrorClassificationContextType = {
    config,
    classifyError,
    getCategoryInfo,
    getTypeInfo,
    getSeverityInfo,
    updateConfig,
    addCustomCategory,
    removeCustomCategory,
  };

  return (
    <ErrorClassificationContext.Provider value={contextValue}>
      {children}
    </ErrorClassificationContext.Provider>
  );
};

// ============================================================================
// ERROR CLASSIFICATION DISPLAY COMPONENTS
// ============================================================================

export const ErrorClassificationDisplay: React.FC<{
  classifiedError: ClassifiedError;
  showDetails?: boolean;
  showSuggestions?: boolean;
}> = ({ classifiedError, showDetails = true, showSuggestions = true }) => {
  const { getCategoryInfo, getSeverityInfo } = useErrorClassification();

  const categoryInfo = getCategoryInfo(classifiedError.category);
  const severityInfo = getSeverityInfo(classifiedError.severity);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted ${categoryInfo.color}`}>
            {categoryInfo.icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{categoryInfo.name}</CardTitle>
            <CardDescription>{categoryInfo.description}</CardDescription>
          </div>
          <div className="text-right space-y-2">
            <Badge className={severityInfo.color}>
              {severityInfo.name}
            </Badge>
            {showDetails && (
              <div className="text-xs text-muted-foreground">
                置信度: {Math.round(classifiedError.confidence * 100)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">错误详情</h4>
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium text-sm mb-2">{classifiedError.error.message}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>类型: {classifiedError.type}</div>
                <div>时间: {new Date(classifiedError.timestamp).toLocaleString()}</div>
                {classifiedError.error.name && (
                  <div>错误名称: {classifiedError.error.name}</div>
                )}
              </div>
            </div>
          </div>

          {/* Patterns */}
          {classifiedError.patterns.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">匹配模式</h4>
              <div className="flex flex-wrap gap-1">
                {classifiedError.patterns.map((pattern, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && classifiedError.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">建议</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {classifiedError.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery Strategies */}
          {showSuggestions && classifiedError.recoveryStrategies.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">恢复策略</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {classifiedError.recoveryStrategies.map((strategy, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Causes */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">常见原因</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {categoryInfo.commonCauses.map((cause, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">解决方案</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {categoryInfo.solutions.map((solution, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metadata */}
          {Object.keys(classifiedError.metadata).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">元数据</h4>
              <div className="rounded-md bg-muted p-3">
                <pre className="text-xs text-muted-foreground">
                  {JSON.stringify(classifiedError.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// ============================================================================
// ERROR SEVERITY INDICATOR
// ============================================================================

export const ErrorSeverityIndicator: React.FC<{
  severity: ErrorSeverity;
  size?: "sm" | "md" | "lg";
}> = ({ severity, size = "md" }) => {
  const { getSeverityInfo } = useErrorClassification();
  const severityInfo = getSeverityInfo(severity);

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`rounded-full ${severityInfo.color} ${sizeClasses[size]}`}
        style={{ backgroundColor: severityInfo.color.replace('text-', '').replace('-500', '') }}
      />
      <span className="text-sm font-medium">{severityInfo.name}</span>
    </div>
  );
};

// ============================================================================
// ERROR CATEGORY BADGE
// ============================================================================

export const ErrorCategoryBadge: React.FC<{
  category: ErrorCategory;
  showIcon?: boolean;
}> = ({ category, showIcon = true }) => {
  const { getCategoryInfo } = useErrorClassification();
  const categoryInfo = getCategoryInfo(category);

  return (
    <Badge variant="outline" className={categoryInfo.color}>
      {showIcon && <span className="mr-1">{categoryInfo.icon}</span>}
      {categoryInfo.name}
    </Badge>
  );
};
