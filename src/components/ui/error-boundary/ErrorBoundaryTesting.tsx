"use client";

import React, { createContext, useContext, useCallback, ReactNode, useState } from "react";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary";
import { PlayerErrorBoundary } from "./PlayerErrorBoundary";
import { TranscriptionErrorBoundary } from "./TranscriptionErrorBoundary";
import { MobileErrorBoundary } from "./MobileErrorBoundary";
import { PerformanceErrorBoundary } from "./PerformanceErrorBoundary";
import { ErrorClassificationProvider, useErrorClassification } from "./ErrorClassification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Bug,
  Play,
  RefreshCw,
  TestTube,
  Settings,
  FileText,
  Wifi,
  WifiOff,
  Smartphone,
  Zap,
  MemoryStick,
  Cpu,
  Timer
} from "lucide-react";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ErrorBoundaryTestConfig {
  enableTestMode: boolean;
  logTestResults: boolean;
  simulateRandomErrors: boolean;
  errorDelay: number;
  maxTestErrors: number;
  testCategories: TestCategory[];
  customErrors: CustomError[];
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  errorTypes: TestErrorType[];
}

export interface TestErrorType {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  generator: () => Error;
  recoverable: boolean;
}

export interface CustomError {
  id: string;
  name: string;
  message: string;
  stack?: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  generator?: () => Error;
}

export interface TestResult {
  id: string;
  errorType: string;
  category: string;
  severity: string;
  recovered: boolean;
  recoveryTime: number;
  attempts: number;
  timestamp: number;
  error: Error;
  context: any;
}

export interface ErrorBoundaryTestContextType {
  config: ErrorBoundaryTestConfig;
  updateConfig: (config: Partial<ErrorBoundaryTestConfig>) => void;
  triggerError: (errorType: string, context?: any) => void;
  triggerCustomError: (error: Error, context?: any) => void;
  clearTestResults: () => void;
  getTestResults: () => TestResult[];
  runTestSuite: () => Promise<void>;
  isTestMode: boolean;
  testResults: TestResult[];
}

// ============================================================================
// ERROR BOUNDARY TEST CONTEXT
// ============================================================================

const ErrorBoundaryTestContext = createContext<ErrorBoundaryTestContextType | null>(null);

export const useErrorBoundaryTesting = () => {
  const context = useContext(ErrorBoundaryTestContext);
  if (!context) {
    throw new Error("useErrorBoundaryTesting must be used within an ErrorBoundaryTestProvider");
  }
  return context;
};

// ============================================================================
// ERROR GENERATORS
// ============================================================================

const errorGenerators: Record<string, () => Error> = {
  // Network errors
  networkTimeout: () => {
    const error = new Error("Network request timeout");
    error.name = "TimeoutError";
    return error;
  },
  networkConnection: () => {
    const error = new Error("Failed to fetch");
    error.name = "NetworkError";
    return error;
  },
  networkCors: () => {
    const error = new Error("CORS policy violation");
    error.name = "NetworkError";
    return error;
  },
  networkSlowConnection: () => {
    const error = new Error("Connection timeout - slow network");
    error.name = "TimeoutError";
    return error;
  },

  // Audio errors
  audioPlayback: () => {
    const error = new Error("Audio playback failed - unsupported format");
    error.name = "AudioError";
    return error;
  },
  audioDevice: () => {
    const error = new Error("No audio device available");
    error.name = "AudioError";
    return error;
  },
  audioPermission: () => {
    const error = new Error("Audio permission denied");
    error.name = "PermissionError";
    return error;
  },

  // Transcription errors
  transcriptionService: () => {
    const error = new Error("Transcription service unavailable");
    error.name = "TranscriptionError";
    return error;
  },
  transcriptionTimeout: () => {
    const error = new Error("Transcription processing timeout");
    error.name = "TimeoutError";
    return error;
  },
  transcriptionInvalidFormat: () => {
    const error = new Error("Invalid audio format for transcription");
    error.name = "ValidationError";
    return error;
  },

  // Mobile errors
  mobileTouch: () => {
    const error = new Error("Touch event handling error");
    error.name = "MobileError";
    return error;
  },
  mobileBattery: () => {
    const error = new Error("Battery level too low for operation");
    error.name = "MobileError";
    return error;
  },
  mobileNetwork: () => {
    const error = new Error("Mobile network connection unstable");
    error.name = "MobileError";
    return error;
  },

  // Performance errors
  performanceMemory: () => {
    const error = new Error("Memory usage exceeded threshold");
    error.name = "PerformanceError";
    return error;
  },
  performanceCPU: () => {
    const error = new Error("CPU usage too high");
    error.name = "PerformanceError";
    return error;
  },
  performanceFrameRate: () => {
    const error = new Error("Frame rate dropped below acceptable level");
    error.name = "PerformanceError";
    return error;
  },

  // Storage errors
  storageQuota: () => {
    const error = new Error("Storage quota exceeded");
    error.name = "StorageError";
    return error;
  },
  storageCorruption: () => {
    const error = new Error("Database corruption detected");
    error.name = "StorageError";
    return error;
  },

  // Authentication errors
  authInvalid: () => {
    const error = new Error("Invalid authentication credentials");
    error.name = "AuthenticationError";
    return error;
  },
  authExpired: () => {
    const error = new Error("Authentication token expired");
    error.name = "AuthenticationError";
    return error;
  },
  authPermission: () => {
    const error = new Error("Insufficient permissions for this operation");
    error.name = "PermissionError";
    return error;
  },

  // Validation errors
  validationRequired: () => {
    const error = new Error("Required field missing");
    error.name = "ValidationError";
    return error;
  },
  validationFormat: () => {
    const error = new Error("Invalid data format");
    error.name = "ValidationError";
    return error;
  },

  // Generic errors
  generic: () => {
    const error = new Error("An unexpected error occurred");
    error.name = "UnknownError";
    return error;
  },
  nullReference: () => {
    const error = new Error("Cannot read property of null");
    error.name = "TypeError";
    return error;
  },
  asyncError: () => {
    const error = new Error("Async operation failed");
    error.name = "AsyncError";
    return error;
  },
};

// ============================================================================
// DEFAULT TEST CATEGORIES
// ============================================================================

const defaultTestCategories: TestCategory[] = [
  {
    id: "network",
    name: "网络错误",
    description: "测试各种网络连接问题",
    enabled: true,
    errorTypes: [
      {
        id: "networkTimeout",
        name: "网络超时",
        description: "模拟网络请求超时",
        severity: "medium",
        category: "network",
        generator: errorGenerators.networkTimeout,
        recoverable: true,
      },
      {
        id: "networkConnection",
        name: "连接失败",
        description: "模拟网络连接失败",
        severity: "high",
        category: "network",
        generator: errorGenerators.networkConnection,
        recoverable: true,
      },
      {
        id: "networkCors",
        name: "CORS错误",
        description: "模拟跨域资源共享错误",
        severity: "medium",
        category: "network",
        generator: errorGenerators.networkCors,
        recoverable: false,
      },
    ],
  },
  {
    id: "audio",
    name: "音频错误",
    description: "测试音频播放和处理错误",
    enabled: true,
    errorTypes: [
      {
        id: "audioPlayback",
        name: "播放失败",
        description: "模拟音频播放失败",
        severity: "high",
        category: "audio",
        generator: errorGenerators.audioPlayback,
        recoverable: true,
      },
      {
        id: "audioDevice",
        name: "设备错误",
        description: "模拟音频设备不可用",
        severity: "high",
        category: "audio",
        generator: errorGenerators.audioDevice,
        recoverable: true,
      },
      {
        id: "audioPermission",
        name: "权限错误",
        description: "模拟音频权限被拒绝",
        severity: "medium",
        category: "audio",
        generator: errorGenerators.audioPermission,
        recoverable: true,
      },
    ],
  },
  {
    id: "transcription",
    name: "转录错误",
    description: "测试音频转录相关错误",
    enabled: true,
    errorTypes: [
      {
        id: "transcriptionService",
        name: "服务不可用",
        description: "模拟转录服务不可用",
        severity: "high",
        category: "transcription",
        generator: errorGenerators.transcriptionService,
        recoverable: true,
      },
      {
        id: "transcriptionTimeout",
        name: "处理超时",
        description: "模拟转录处理超时",
        severity: "medium",
        category: "transcription",
        generator: errorGenerators.transcriptionTimeout,
        recoverable: true,
      },
      {
        id: "transcriptionInvalidFormat",
        name: "格式错误",
        description: "模拟不支持的音频格式",
        severity: "medium",
        category: "transcription",
        generator: errorGenerators.transcriptionInvalidFormat,
        recoverable: true,
      },
    ],
  },
  {
    id: "mobile",
    name: "移动端错误",
    description: "测试移动设备特定错误",
    enabled: true,
    errorTypes: [
      {
        id: "mobileTouch",
        name: "触摸事件错误",
        description: "模拟触摸事件处理错误",
        severity: "low",
        category: "mobile",
        generator: errorGenerators.mobileTouch,
        recoverable: true,
      },
      {
        id: "mobileBattery",
        name: "电量不足",
        description: "模拟电量过低错误",
        severity: "medium",
        category: "mobile",
        generator: errorGenerators.mobileBattery,
        recoverable: true,
      },
      {
        id: "mobileNetwork",
        name: "移动网络问题",
        description: "模拟移动网络不稳定",
        severity: "high",
        category: "mobile",
        generator: errorGenerators.mobileNetwork,
        recoverable: true,
      },
    ],
  },
  {
    id: "performance",
    name: "性能错误",
    description: "测试性能相关问题",
    enabled: true,
    errorTypes: [
      {
        id: "performanceMemory",
        name: "内存溢出",
        description: "模拟内存使用过高",
        severity: "high",
        category: "performance",
        generator: errorGenerators.performanceMemory,
        recoverable: true,
      },
      {
        id: "performanceCPU",
        name: "CPU使用过高",
        description: "模拟CPU使用率过高",
        severity: "high",
        category: "performance",
        generator: errorGenerators.performanceCPU,
        recoverable: true,
      },
      {
        id: "performanceFrameRate",
        name: "帧率过低",
        description: "模拟帧率过低",
        severity: "medium",
        category: "performance",
        generator: errorGenerators.performanceFrameRate,
        recoverable: true,
      },
    ],
  },
];

// ============================================================================
// ERROR BOUNDARY TEST PROVIDER
// ============================================================================

export const ErrorBoundaryTestProvider: React.FC<{
  children: ReactNode;
  config?: Partial<ErrorBoundaryTestConfig>;
}> = ({ children, config: initialConfig = {} }) => {
  const [config, setConfig] = React.useState<ErrorBoundaryTestConfig>({
    enableTestMode: process.env.NODE_ENV === "development",
    logTestResults: true,
    simulateRandomErrors: false,
    errorDelay: 0,
    maxTestErrors: 10,
    testCategories: defaultTestCategories,
    customErrors: [],
    ...initialConfig,
  });

  const [testResults, setTestResults] = React.useState<TestResult[]>([]);
  const [testMode, setTestMode] = React.useState(false);

  // Random error simulation
  React.useEffect(() => {
    if (config.simulateRandomErrors && config.enableTestMode) {
      const interval = setInterval(() => {
        if (Math.random() < 0.1 && testResults.length < config.maxTestErrors) {
          const enabledCategories = config.testCategories.filter(cat => cat.enabled);
          if (enabledCategories.length > 0) {
            const category = enabledCategories[Math.floor(Math.random() * enabledCategories.length)];
            const errorType = category.errorTypes[Math.floor(Math.random() * category.errorTypes.length)];
            triggerError(errorType.id, { simulated: true });
          }
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [config.simulateRandomErrors, config.enableTestMode, config.testCategories, testResults.length, config.maxTestErrors]);

  const triggerError = useCallback((errorType: string, context: any = {}) => {
    if (!config.enableTestMode) return;

    const errorGenerator = errorGenerators[errorType];
    if (!errorGenerator) {
      console.warn(`Unknown error type: ${errorType}`);
      return;
    }

    const error = errorGenerator();
    const startTime = Date.now();

    // Simulate error delay
    setTimeout(() => {
      // Trigger the error by throwing it
      try {
        throw error;
      } catch (e) {
        const testResult: TestResult = {
          id: Math.random().toString(36).substr(2, 9),
          errorType,
          category: getCategoryFromErrorType(errorType),
          severity: getSeverityFromErrorType(errorType),
          recovered: false,
          recoveryTime: 0,
          attempts: 1,
          timestamp: startTime,
          error: error,
          context: { ...context, simulated: true },
        };

        setTestResults(prev => [...prev.slice(-config.maxTestErrors + 1), testResult]);

        if (config.logTestResults) {
          console.log(`[Error Test] Triggered ${errorType}:`, error, context);
        }
      }
    }, config.errorDelay);
  }, [config.enableTestMode, config.errorDelay, config.logTestResults, config.maxTestErrors]);

  const triggerCustomError = useCallback((error: Error, context: any = {}) => {
    if (!config.enableTestMode) return;

    const startTime = Date.now();

    setTimeout(() => {
      try {
        throw error;
      } catch (e) {
        const testResult: TestResult = {
          id: Math.random().toString(36).substr(2, 9),
          errorType: "custom",
          category: "custom",
          severity: "medium",
          recovered: false,
          recoveryTime: 0,
          attempts: 1,
          timestamp: startTime,
          error: error,
          context: { ...context, custom: true },
        };

        setTestResults(prev => [...prev.slice(-config.maxTestErrors + 1), testResult]);

        if (config.logTestResults) {
          console.log(`[Error Test] Triggered custom error:`, error, context);
        }
      }
    }, config.errorDelay);
  }, [config.enableTestMode, config.errorDelay, config.logTestResults, config.maxTestErrors]);

  const clearTestResults = useCallback(() => {
    setTestResults([]);
  }, []);

  const getTestResults = useCallback((): TestResult[] => {
    return testResults;
  }, [testResults]);

  const runTestSuite = useCallback(async () => {
    if (!config.enableTestMode) return;

    const enabledCategories = config.testCategories.filter(cat => cat.enabled);
    const allErrorTypes = enabledCategories.flatMap(cat => cat.errorTypes);

    for (const errorType of allErrorTypes) {
      triggerError(errorType.id, { testSuite: true });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between errors
    }
  }, [config.enableTestMode, config.testCategories, triggerError]);

  const updateConfig = useCallback((newConfig: Partial<ErrorBoundaryTestConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const contextValue: ErrorBoundaryTestContextType = {
    config,
    updateConfig,
    triggerError,
    triggerCustomError,
    clearTestResults,
    getTestResults,
    runTestSuite,
    isTestMode: config.enableTestMode,
    testResults,
  };

  return (
    <ErrorBoundaryTestContext.Provider value={contextValue}>
      {children}
    </ErrorBoundaryTestContext.Provider>
  );
};

// ============================================================================
// ERROR TESTING UTILITIES
// ============================================================================

const getCategoryFromErrorType = (errorType: string): string => {
  if (errorType.startsWith("network")) return "network";
  if (errorType.startsWith("audio")) return "audio";
  if (errorType.startsWith("transcription")) return "transcription";
  if (errorType.startsWith("mobile")) return "mobile";
  if (errorType.startsWith("performance")) return "performance";
  if (errorType.startsWith("storage")) return "storage";
  if (errorType.startsWith("auth")) return "authentication";
  if (errorType.startsWith("validation")) return "validation";
  return "unknown";
};

const getSeverityFromErrorType = (errorType: string): "low" | "medium" | "high" | "critical" => {
  // Map error types to severities
  const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
    networkTimeout: "medium",
    networkConnection: "high",
    networkCors: "medium",
    audioPlayback: "high",
    audioDevice: "high",
    audioPermission: "medium",
    transcriptionService: "high",
    transcriptionTimeout: "medium",
    transcriptionInvalidFormat: "medium",
    mobileTouch: "low",
    mobileBattery: "medium",
    mobileNetwork: "high",
    performanceMemory: "critical",
    performanceCPU: "critical",
    performanceFrameRate: "medium",
    storageQuota: "high",
    storageCorruption: "critical",
    authInvalid: "high",
    authExpired: "medium",
    authPermission: "high",
    validationRequired: "low",
    validationFormat: "low",
  };

  return severityMap[errorType] || "medium";
};

// ============================================================================
// TEST ERROR BOUNDARY COMPONENT
// ============================================================================

export const TestErrorBoundary: React.FC<{
  children: ReactNode;
  testType?: "general" | "player" | "transcription" | "mobile" | "performance";
  onError?: (error: Error, errorInfo: any) => void;
}> = ({ children, testType = "general", onError }) => {
  const { triggerError, isTestMode } = useErrorBoundaryTesting();

  if (!isTestMode) {
    return <>{children}</>;
  }

  const handleError = (error: Error, errorInfo: any) => {
    console.log(`[Test Error Boundary] ${testType} caught error:`, error, errorInfo);
    onError?.(error, errorInfo);
  };

  const getErrorBoundary = () => {
    switch (testType) {
      case "player":
        return (
          <PlayerErrorBoundary onError={handleError}>
            {children}
          </PlayerErrorBoundary>
        );
      case "transcription":
        return (
          <TranscriptionErrorBoundary onError={handleError}>
            {children}
          </TranscriptionErrorBoundary>
        );
      case "mobile":
        return (
          <MobileErrorBoundary onError={handleError}>
            {children}
          </MobileErrorBoundary>
        );
      case "performance":
        return (
          <PerformanceErrorBoundary onError={handleError}>
            {children}
          </PerformanceErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary onError={handleError}>
            {children}
          </ErrorBoundary>
        );
    }
  };

  return getErrorBoundary();
};

// ============================================================================
// ERROR TESTING PANEL COMPONENT
// ============================================================================

export const ErrorTestingPanel: React.FC = () => {
  const {
    config,
    updateConfig,
    triggerError,
    triggerCustomError,
    clearTestResults,
    getTestResults,
    runTestSuite,
    testResults,
  } = useErrorBoundaryTesting();

  const [customErrorMessage, setCustomErrorMessage] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [selectedErrorType, setSelectedErrorType] = React.useState("");

  const handleTriggerError = () => {
    if (selectedErrorType) {
      triggerError(selectedErrorType, { manual: true });
    }
  };

  const handleTriggerCustomError = () => {
    if (customErrorMessage) {
      const error = new Error(customErrorMessage);
      triggerCustomError(error, { manual: true });
    }
  };

  const getErrorTypeIcon = (categoryId: string) => {
    switch (categoryId) {
      case "network":
        return <WifiOff className="h-4 w-4" />;
      case "audio":
        return <TestTube className="h-4 w-4" />;
      case "transcription":
        return <FileText className="h-4 w-4" />;
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "performance":
        return <Zap className="h-4 w-4" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedCategoryData = config.testCategories.find(cat => cat.id === selectedCategory);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-5 w-5" />
          <span>错误边界测试面板</span>
          {config.enableTestMode && (
            <Badge variant="secondary">测试模式</Badge>
          )}
        </CardTitle>
        <CardDescription>
          测试和验证错误边界的功能和恢复机制
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Test Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium">测试配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableTestMode"
                checked={config.enableTestMode}
                onChange={(e) => updateConfig({ enableTestMode: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="enableTestMode">启用测试模式</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="logTestResults"
                checked={config.logTestResults}
                onChange={(e) => updateConfig({ logTestResults: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="logTestResults">记录测试结果</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="simulateRandomErrors"
                checked={config.simulateRandomErrors}
                onChange={(e) => updateConfig({ simulateRandomErrors: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="simulateRandomErrors">随机错误模拟</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="errorDelay">错误延迟 (ms)</Label>
              <Input
                id="errorDelay"
                type="number"
                value={config.errorDelay}
                onChange={(e) => updateConfig({ errorDelay: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="maxTestErrors">最大测试错误数</Label>
              <Input
                id="maxTestErrors"
                type="number"
                value={config.maxTestErrors}
                onChange={(e) => updateConfig({ maxTestErrors: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Error Triggering */}
        <div className="space-y-4">
          <h3 className="font-medium">触发错误</h3>

          {/* Category and Error Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">错误类别</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择错误类别" />
                </SelectTrigger>
                <SelectContent>
                  {config.testCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        {getErrorTypeIcon(category.id)}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="errorType">错误类型</Label>
              <Select
                value={selectedErrorType}
                onValueChange={setSelectedErrorType}
                disabled={!selectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择错误类型" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategoryData?.errorTypes.map((errorType) => (
                    <SelectItem key={errorType.id} value={errorType.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{errorType.name}</span>
                        <Badge className={getSeverityColor(errorType.severity)}>
                          {errorType.severity}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Error */}
          <div>
            <Label htmlFor="customError">自定义错误消息</Label>
            <Textarea
              id="customError"
              placeholder="输入自定义错误消息..."
              value={customErrorMessage}
              onChange={(e) => setCustomErrorMessage(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              onClick={handleTriggerError}
              disabled={!selectedErrorType || !config.enableTestMode}
            >
              <Bug className="mr-2 h-4 w-4" />
              触发选中错误
            </Button>
            <Button
              onClick={handleTriggerCustomError}
              disabled={!customErrorMessage || !config.enableTestMode}
              variant="outline"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              触发自定义错误
            </Button>
            <Button
              onClick={runTestSuite}
              disabled={!config.enableTestMode}
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              运行测试套件
            </Button>
          </div>
        </div>

        <Separator />

        {/* Test Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">测试结果</h3>
            <Button
              onClick={clearTestResults}
              variant="outline"
              size="sm"
              disabled={testResults.length === 0}
            >
              清除结果
            </Button>
          </div>

          {testResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无测试结果</p>
              <p className="text-sm">触发一些错误来查看结果</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    {getErrorTypeIcon(result.category)}
                    <div>
                      <div className="font-medium text-sm">{result.errorType}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.error.message}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(result.severity)}>
                      {result.severity}
                    </Badge>
                    <Badge variant={result.recovered ? "default" : "secondary"}>
                      {result.recovered ? "已恢复" : "未恢复"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{testResults.length}</div>
                <div className="text-sm text-muted-foreground">总错误数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.recovered).length}
                </div>
                <div className="text-sm text-muted-foreground">已恢复</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => !r.recovered).length}
                </div>
                <div className="text-sm text-muted-foreground">未恢复</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((testResults.filter(r => r.recovered).length / testResults.length) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">恢复率</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// DEV TOOLS INTEGRATION
// ============================================================================

export const ErrorBoundaryDevTools: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { config, updateConfig } = useErrorBoundaryTesting();

  React.useEffect(() => {
    if (config.enableTestMode && typeof window !== "undefined") {
      // Add keyboard shortcut for dev tools (Ctrl+Shift+E)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === "E") {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [config.enableTestMode]);

  if (!config.enableTestMode) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-red-500 text-white rounded-full p-3 shadow-lg hover:bg-red-600 transition-colors"
        title="打开错误测试工具 (Ctrl+Shift+E)"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Dev tools panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">错误边界开发工具</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <ErrorTestingPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
