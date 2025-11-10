"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Smartphone, Wifi, WifiOff, Battery, BatteryLow, RefreshCw, Download, Settings, Touch } from "lucide-react";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ErrorClassifier, MobileRecoveryOptimization, type ErrorContext } from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface MobileErrorBoundaryProps extends Omit<ErrorBoundaryProps, "children" | "context"> {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  enableTouchOptimizations?: boolean;
  enableBatteryOptimization?: boolean;
  enableNetworkOptimization?: boolean;
  enableOfflineMode?: boolean;
  onMobileError?: (error: Error, context: MobileErrorContext) => void;
  onOfflineMode?: () => void;
  onLowBatteryMode?: () => void;
}

export interface MobileErrorContext extends ErrorContext {
  deviceInfo?: {
    isMobile: boolean;
    isTablet: boolean;
    platform: string;
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
    touchSupport: boolean;
    batteryLevel?: number;
    isCharging?: boolean;
    connectionType?: string;
    effectiveType?: string;
  };
  mobileFeatures?: {
    touchOptimizations: boolean;
    batteryOptimization: boolean;
    networkOptimization: boolean;
    offlineMode: boolean;
  };
}

interface MobileErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  deviceInfo: MobileErrorContext["deviceInfo"];
  onRetry: () => void;
  onReset: () => void;
  onOfflineMode?: () => void;
  onLowBatteryMode?: () => void;
  onSettings?: () => void;
  onReport?: () => void;
  isRecovering: boolean;
  recoveryAttempts: number;
  enableOfflineMode: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  connectionType?: string;
}

// ============================================================================
// MOBILE ERROR BOUNDARY COMPONENT
// ============================================================================

export class MobileErrorBoundary extends Component<MobileErrorBoundaryProps> {
  private mobileErrorClassifier: ErrorClassifier;
  private mobileOptimization: MobileRecoveryOptimization;
  private deviceInfo: MobileErrorContext["deviceInfo"];
  private networkMonitor: NetworkMonitor | null = null;
  private batteryMonitor: BatteryMonitor | null = null;

  constructor(props: MobileErrorBoundaryProps) {
    super(props);
    this.mobileErrorClassifier = ErrorClassifier.getInstance();
    this.mobileOptimization = new MobileRecoveryOptimization();
    this.deviceInfo = this.getDeviceInfo();
  }

  componentDidMount() {
    this.initializeMobileMonitoring();
  }

  componentWillUnmount() {
    this.cleanupMobileMonitoring();
  }

  private getDeviceInfo = (): MobileErrorContext["deviceInfo"] => {
    if (typeof window === "undefined") {
      return {
        isMobile: false,
        isTablet: false,
        platform: "unknown",
        userAgent: "",
        screenWidth: 0,
        screenHeight: 0,
        pixelRatio: 1,
        touchSupport: false,
      };
    }

    const userAgent = window.navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;
    const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Detect device type
    const isMobile = screenWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = screenWidth > 768 && screenWidth <= 1024 && (/iPad|Android/i.test(userAgent));

    // Detect platform
    let platform = "unknown";
    if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "ios";
    else if (/Android/i.test(userAgent)) platform = "android";
    else if (/Windows Phone/i.test(userAgent)) platform = "windows";
    else if (/Mac/i.test(userAgent)) platform = "mac";
    else if (/Win/i.test(userAgent)) platform = "windows";
    else if (/Linux/i.test(userAgent)) platform = "linux";

    return {
      isMobile,
      isTablet,
      platform,
      userAgent,
      screenWidth,
      screenHeight,
      pixelRatio,
      touchSupport,
    };
  };

  private initializeMobileMonitoring = async () => {
    // Initialize network monitoring
    if ("connection" in navigator) {
      this.networkMonitor = new NetworkMonitor();
      this.networkMonitor.start();

      const connection = (navigator as any).connection;
      this.deviceInfo.connectionType = connection.effectiveType || "unknown";
      this.deviceInfo.effectiveType = connection.effectiveType || "unknown";
    }

    // Initialize battery monitoring
    if ("getBattery" in navigator) {
      try {
        this.batteryMonitor = new BatteryMonitor();
        await this.batteryMonitor.start();
        this.deviceInfo.batteryLevel = this.batteryMonitor.getLevel();
        this.deviceInfo.isCharging = this.batteryMonitor.isCharging();
      } catch (error) {
        console.warn("Battery monitoring not available:", error);
      }
    }

    // Initialize touch optimizations
    if (this.props.enableTouchOptimizations) {
      this.initializeTouchOptimizations();
    }
  };

  private cleanupMobileMonitoring = () => {
    this.networkMonitor?.stop();
    this.batteryMonitor?.stop();
  };

  private initializeTouchOptimizations = () => {
    // Add touch-friendly error handling
    if (this.deviceInfo.touchSupport) {
      document.addEventListener("touchstart", this.handleTouchError, { passive: true });
    }
  };

  private handleTouchError = (event: TouchEvent) => {
    // Handle touch-related errors
    if (event.touches.length > 10) {
      console.warn("Too many touch points detected");
    }
  };

  private handleMobileError = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // Update device info with current state
    const updatedDeviceInfo = {
      ...this.deviceInfo,
      batteryLevel: this.batteryMonitor?.getLevel(),
      isCharging: this.batteryMonitor?.isCharging(),
      connectionType: this.networkMonitor?.getConnectionType(),
      effectiveType: this.networkMonitor?.getEffectiveType(),
    };

    // Create mobile-specific error context
    const mobileContext: MobileErrorContext = {
      ...context,
      deviceInfo: updatedDeviceInfo,
      mobileFeatures: {
        touchOptimizations: this.props.enableTouchOptimizations ?? true,
        batteryOptimization: this.props.enableBatteryOptimization ?? true,
        networkOptimization: this.props.enableNetworkOptimization ?? true,
        offlineMode: this.props.enableOfflineMode ?? true,
      },
      category: "mobile",
    };

    // Call parent error handler
    this.props.onError?.(error, errorInfo, mobileContext);

    // Call specific mobile error handler
    this.props.onMobileError?.(error, mobileContext);

    // Log mobile-specific error
    this.mobileErrorClassifier.logError(error, mobileContext);

    // Apply mobile-specific recovery strategies
    this.applyMobileRecoveryStrategies(error, mobileContext);
  };

  private applyMobileRecoveryStrategies = (error: Error, context: MobileErrorContext) => {
    const recoveryStrategies = this.mobileOptimization.getMobileRecoveryStrategies(error, context);

    recoveryStrategies.forEach((strategy, index) => {
      setTimeout(() => {
        try {
          strategy.execute();
        } catch (strategyError) {
          console.error(`Mobile recovery strategy ${index} failed:`, strategyError);
        }
      }, index * 1000); // Execute strategies with 1-second delays
    });
  };

  private handleOfflineMode = () => {
    this.props.onOfflineMode?.();
  };

  private handleLowBatteryMode = () => {
    this.props.onLowBatteryMode?.();
  };

  private handleMobileSettings = () => {
    // Open mobile settings dialog or navigate to settings page
    console.log("Opening mobile settings");
  };

  render() {
    const {
      children,
      fallbackComponent,
      enableTouchOptimizations = true,
      enableBatteryOptimization = true,
      enableNetworkOptimization = true,
      enableOfflineMode = true,
      ...errorBoundaryProps
    } = this.props;

    // Create mobile-specific error context
    const mobileContext: Partial<MobileErrorContext> = {
      deviceInfo: this.deviceInfo,
      mobileFeatures: {
        touchOptimizations: enableTouchOptimizations,
        batteryOptimization: enableBatteryOptimization,
        networkOptimization: enableNetworkOptimization,
        offlineMode: enableOfflineMode,
      },
      category: "mobile",
    };

    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        context={mobileContext}
        onError={this.handleMobileError}
        enableRecovery={true}
        fallbackComponent={
          fallbackComponent || (
            <MobileErrorFallback
              deviceInfo={this.deviceInfo}
              batteryLevel={this.batteryMonitor?.getLevel()}
              isCharging={this.batteryMonitor?.isCharging()}
              connectionType={this.networkMonitor?.getConnectionType()}
              enableOfflineMode={enableOfflineMode}
              onOfflineMode={this.handleOfflineMode}
              onLowBatteryMode={this.handleLowBatteryMode}
              onSettings={this.handleMobileSettings}
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
// MOBILE ERROR FALLBACK COMPONENT
// ============================================================================

const MobileErrorFallback: React.FC<MobileErrorFallbackProps> = ({
  error,
  errorInfo,
  deviceInfo,
  onRetry,
  onReset,
  onOfflineMode,
  onLowBatteryMode,
  onSettings,
  onReport,
  isRecovering,
  recoveryAttempts,
  enableOfflineMode,
  batteryLevel,
  isCharging,
  connectionType,
}) => {
  const isLowBattery = batteryLevel !== undefined && batteryLevel < 0.2 && !isCharging;
  const isPoorConnection = connectionType === "slow-2g" || connectionType === "2g" || connectionType === "3g";

  const getNetworkStatus = () => {
    if (!connectionType) return { icon: <WifiOff className="h-4 w-4" />, color: "text-gray-500", text: "未知" };

    switch (connectionType) {
      case "slow-2g":
      case "2g":
        return { icon: <WifiOff className="h-4 w-4" />, color: "text-red-500", text: "网络慢" };
      case "3g":
        return { icon: <Wifi className="h-4 w-4" />, color: "text-orange-500", text: "3G" };
      case "4g":
        return { icon: <Wifi className="h-4 w-4" />, color: "text-green-500", text: "4G" };
      default:
        return { icon: <Wifi className="h-4 w-4" />, color: "text-blue-500", text: "WiFi" };
    }
  };

  const getBatteryStatus = () => {
    if (batteryLevel === undefined) {
      return { icon: <Battery className="h-4 w-4" />, color: "text-gray-500", text: "未知" };
    }

    if (isCharging) {
      return { icon: <Battery className="h-4 w-4" />, color: "text-green-500", text: "充电中" };
    }

    if (isLowBattery) {
      return { icon: <BatteryLow className="h-4 w-4" />, color: "text-red-500", text: "低电量" };
    }

    return { icon: <Battery className="h-4 w-4" />, color: "text-blue-500", text: `${Math.round(batteryLevel * 100)}%` };
  };

  const networkStatus = getNetworkStatus();
  const batteryStatus = getBatteryStatus();

  const getErrorIcon = () => {
    if (isPoorConnection) {
      return <WifiOff className="h-8 w-8 text-orange-500" />;
    }
    if (isLowBattery) {
      return <BatteryLow className="h-8 w-8 text-red-500" />;
    }
    return <Smartphone className="h-8 w-8 text-destructive" />;
  };

  const getErrorMessage = () => {
    if (isPoorConnection) {
      return "网络连接不稳定，应用功能可能受限。";
    }
    if (isLowBattery) {
      return "电量不足，建议充电或开启省电模式。";
    }
    return "移动应用出现错误，正在尝试修复...";
  };

  const getOptimizedActions = () => {
    const actions = [
      <Button key="retry" onClick={onRetry} disabled={isRecovering} className="flex-1">
        <RefreshCw className="mr-2 h-4 w-4" />
        重试 {recoveryAttempts > 0 && `(${recoveryAttempts}/3)`}
      </Button>,
    ];

    if (isPoorConnection && enableOfflineMode && onOfflineMode) {
      actions.push(
        <Button key="offline" variant="outline" className="flex-1" onClick={onOfflineMode}>
          <Download className="mr-2 h-4 w-4" />
          离线模式
        </Button>
      );
    }

    if (isLowBattery && onLowBatteryMode) {
      actions.push(
        <Button key="battery" variant="outline" className="flex-1" onClick={onLowBatteryMode}>
          <BatteryLow className="mr-2 h-4 w-4" />
          省电模式
        </Button>
      );
    }

    actions.push(
      <Button key="settings" variant="outline" className="flex-1" onClick={onSettings}>
        <Settings className="mr-2 h-4 w-4" />
        设置
      </Button>
    );

    return actions;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          {getErrorIcon()}
        </div>
        <div className="space-y-2">
          <CardTitle className="font-bold text-lg">移动应用错误</CardTitle>
          <CardDescription className="text-base">{getErrorMessage()}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Device Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <div className={networkStatus.color}>
              {networkStatus.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">网络</p>
              <p className={`text-xs ${networkStatus.color}`}>{networkStatus.text}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <div className={batteryStatus.color}>
              {batteryStatus.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">电量</p>
              <p className={`text-xs ${batteryStatus.color}`}>{batteryStatus.text}</p>
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="rounded-md bg-muted p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Touch className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">设备信息</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>平台: {deviceInfo?.platform || "未知"}</div>
            <div>屏幕: {deviceInfo?.screenWidth || 0}x{deviceInfo?.screenHeight || 0}</div>
            <div>触屏: {deviceInfo?.touchSupport ? "支持" : "不支持"}</div>
            <div>设备: {deviceInfo?.isMobile ? "手机" : deviceInfo?.isTablet ? "平板" : "桌面"}</div>
          </div>
        </div>

        {/* Error Actions */}
        <div className="grid grid-cols-2 gap-2">
          {getOptimizedActions()}
        </div>

        {/* Recovery Progress */}
        {isRecovering && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-800 text-sm">
                正在优化移动体验... ({recoveryAttempts + 1}/3)
              </span>
            </div>
          </div>
        )}

        {/* Optimization Suggestions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">优化建议：</h4>

          {isPoorConnection && (
            <div className="rounded-md bg-orange-50 p-3">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-orange-600" />
                <span className="text-orange-800 text-sm">
                  网络连接较慢，建议使用离线模式或连接WiFi
                </span>
              </div>
            </div>
          )}

          {isLowBattery && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex items-center space-x-2">
                <BatteryLow className="h-4 w-4 text-red-600" />
                <span className="text-red-800 text-sm">
                  电量不足，建议开启省电模式或充电
                </span>
              </div>
            </div>
          )}

          {!isPoorConnection && !isLowBattery && (
            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 text-sm">
                  检查应用权限和设置，确保正常运行
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Touch-Friendly Actions */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onReset}
              className="min-h-[48px] touch-manipulation"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              重置应用
            </Button>

            {onReport && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onReport}
                className="min-h-[48px] touch-manipulation"
              >
                报告问题
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MOBILE MONITORING UTILITIES
// ============================================================================

class NetworkMonitor {
  private connection: any;
  private listeners: Array<() => void> = [];

  constructor() {
    this.connection = (navigator as any).connection;
  }

  start() {
    if (this.connection) {
      const handleChange = () => {
        this.listeners.forEach(listener => listener());
      };

      this.connection.addEventListener("change", handleChange);
    }
  }

  stop() {
    if (this.connection) {
      this.connection.removeEventListener("change", () => {});
    }
  }

  getConnectionType(): string {
    return this.connection?.effectiveType || "unknown";
  }

  getEffectiveType(): string {
    return this.connection?.effectiveType || "unknown";
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }
}

class BatteryMonitor {
  private battery: any;

  async start() {
    if ("getBattery" in navigator) {
      this.battery = await (navigator as any).getBattery();
    }
  }

  stop() {
    // Clean up battery monitoring if needed
  }

  getLevel(): number | undefined {
    return this.battery?.level;
  }

  isCharging(): boolean | undefined {
    return this.battery?.charging;
  }
}

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

export const TouchOptimizedErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <MobileErrorBoundary
    enableTouchOptimizations={true}
    enableBatteryOptimization={false}
    enableNetworkOptimization={false}
    enableOfflineMode={false}
    showDetails={false}
    allowReport={false}
  >
    {children}
  </MobileErrorBoundary>
);

export const OfflineFirstErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <MobileErrorBoundary
    enableOfflineMode={true}
    enableNetworkOptimization={true}
    enableBatteryOptimization={true}
    showDetails={false}
    allowReport={false}
  >
    {children}
  </MobileErrorBoundary>
);
