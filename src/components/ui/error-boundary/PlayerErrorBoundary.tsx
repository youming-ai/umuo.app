"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, Download } from "lucide-react";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { MobileErrorBoundary } from "./MobileErrorBoundary";
import { ErrorClassifier, type ErrorContext } from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PlayerErrorBoundaryProps extends Omit<ErrorBoundaryProps, "children" | "context"> {
  children: ReactNode;
  audioFile?: {
    id: string;
    name: string;
    duration?: number;
    size?: number;
  };
  fallbackComponent?: ReactNode;
  enableOfflineMode?: boolean;
  enableAudioFallback?: boolean;
  onAudioError?: (error: Error, audioInfo: any) => void;
}

interface PlayerErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  audioFile?: {
    id: string;
    name: string;
    duration?: number;
    size?: number;
  };
  onRetry: () => void;
  onFallbackMode: () => void;
  onDownloadFile?: () => void;
  onReset: () => void;
  enableOfflineMode: boolean;
  enableAudioFallback: boolean;
  isRecovering: boolean;
  recoveryAttempts: number;
}

// ============================================================================
// PLAYER ERROR BOUNDARY COMPONENT
// ============================================================================

export class PlayerErrorBoundary extends Component<PlayerErrorBoundaryProps> {
  private playerErrorClassifier: ErrorClassifier;
  private audioElement: HTMLAudioElement | null = null;

  constructor(props: PlayerErrorBoundaryProps) {
    super(props);
    this.playerErrorClassifier = ErrorClassifier.getInstance();
  }

  componentDidMount() {
    // Initialize audio context monitoring
    this.initializeAudioMonitoring();
  }

  componentWillUnmount() {
    // Clean up audio monitoring
    this.cleanupAudioMonitoring();
  }

  private initializeAudioMonitoring = () => {
    // Monitor for audio-related errors
    if (typeof window !== "undefined") {
      window.addEventListener("error", this.handleGlobalAudioError, true);
    }
  };

  private cleanupAudioMonitoring = () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("error", this.handleGlobalAudioError, true);
    }
  };

  private handleGlobalAudioError = (event: ErrorEvent) => {
    // Check if error is related to audio playback
    if (
      event.filename?.includes("audio") ||
      event.message?.includes("audio") ||
      event.message?.includes("media") ||
      event.target instanceof HTMLAudioElement
    ) {
      console.warn("Audio-related global error detected:", event);
    }
  };

  private handlePlayerError = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // Enrich context with player-specific information
    const enrichedContext: ErrorContext = {
      ...context,
      component: "AudioPlayer",
      audioFile: this.props.audioFile,
      audioContext: this.getAudioContext(),
      playbackState: this.getPlaybackState(),
    };

    // Call parent error handler
    this.props.onError?.(error, errorInfo, enrichedContext);

    // Call specific audio error handler
    this.props.onAudioError?.(error, {
      audioFile: this.props.audioFile,
      context: enrichedContext,
    });

    // Log player-specific error
    this.playerErrorClassifier.logError(error, enrichedContext);
  };

  private getAudioContext = () => {
    // Return audio context information
    return {
      supported: typeof AudioContext !== "undefined",
      state: this.audioElement?.readyState,
      currentTime: this.audioElement?.currentTime,
      duration: this.audioElement?.duration,
      paused: this.audioElement?.paused,
      volume: this.audioElement?.volume,
      muted: this.audioElement?.muted,
    };
  };

  private getPlaybackState = () => {
    // Return current playback state
    return {
      isPlaying: !this.audioElement?.paused,
      currentTime: this.audioElement?.currentTime || 0,
      duration: this.audioElement?.duration || 0,
      volume: this.audioElement?.volume || 1,
      muted: this.audioElement?.muted || false,
      playbackRate: this.audioElement?.playbackRate || 1,
    };
  };

  private handleFallbackMode = () => {
    // Switch to fallback audio player mode
    console.log("Switching to fallback audio mode");
    // Implementation would depend on your fallback player
  };

  private handleDownloadFile = () => {
    if (this.props.audioFile?.id) {
      // Trigger download of audio file
      const link = document.createElement("a");
      link.href = `/api/files/${this.props.audioFile.id}/download`;
      link.download = this.props.audioFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  render() {
    const {
      children,
      audioFile,
      fallbackComponent,
      enableOfflineMode = true,
      enableAudioFallback = true,
      ...errorBoundaryProps
    } = this.props;

    // Create player-specific error context
    const playerContext: Partial<ErrorContext> = {
      component: "AudioPlayer",
      category: "audio",
      audioFile,
      features: {
        offlineMode: enableOfflineMode,
        audioFallback: enableAudioFallback,
      },
    };

    // Use mobile error boundary if on mobile device
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return (
        <MobileErrorBoundary
          {...errorBoundaryProps}
          context={playerContext}
          onError={this.handlePlayerError}
          enableRecovery={true}
          fallbackComponent={
            fallbackComponent || (
              <MobilePlayerErrorFallback
                audioFile={audioFile}
                enableOfflineMode={enableOfflineMode}
                enableAudioFallback={enableAudioFallback}
                onDownloadFile={this.handleDownloadFile}
                onFallbackMode={this.handleFallbackMode}
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
        context={playerContext}
        onError={this.handlePlayerError}
        enableRecovery={true}
        fallbackComponent={
          fallbackComponent || (
            <PlayerErrorFallback
              audioFile={audioFile}
              enableOfflineMode={enableOfflineMode}
              enableAudioFallback={enableAudioFallback}
              onDownloadFile={this.handleDownloadFile}
              onFallbackMode={this.handleFallbackMode}
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
// PLAYER ERROR FALLBACK COMPONENT
// ============================================================================

const PlayerErrorFallback: React.FC<PlayerErrorFallbackProps> = ({
  error,
  errorInfo,
  audioFile,
  onRetry,
  onFallbackMode,
  onDownloadFile,
  onReset,
  enableOfflineMode,
  enableAudioFallback,
  isRecovering,
  recoveryAttempts,
}) => {
  const isAudioError = error.message.toLowerCase().includes("audio") ||
                      error.message.toLowerCase().includes("media") ||
                      error.message.toLowerCase().includes("playback");

  const getErrorIcon = () => {
    if (isAudioError) {
      return <VolumeX className="h-8 w-8 text-destructive" />;
    }
    return <RotateCcw className="h-8 w-8 text-destructive" />;
  };

  const getErrorMessage = () => {
    if (isAudioError) {
      return "音频播放遇到问题。可能是文件格式不支持或网络连接问题。";
    }
    return "播放器组件出现错误。";
  };

  const getErrorSuggestions = () => {
    if (isAudioError) {
      return [
        "检查音频文件格式是否支持",
        "确认网络连接正常",
        "尝试重新加载页面",
        "使用备用播放模式",
      ];
    }
    return [
      "刷新页面重试",
      "检查网络连接",
      "清除浏览器缓存",
      "使用其他浏览器尝试",
    ];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            {getErrorIcon()}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">播放器错误</CardTitle>
            <CardDescription>{getErrorMessage()}</CardDescription>
          </div>
        </div>

        {audioFile && (
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{audioFile.name}</p>
                <p className="text-muted-foreground text-xs">
                  {audioFile.duration ? `时长: ${Math.round(audioFile.duration)}秒` : ""}
                  {audioFile.size ? ` | 大小: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB` : ""}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                音频文件
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onRetry} disabled={isRecovering} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            重试播放
          </Button>
          <Button onClick={onReset} variant="outline" className="w-full">
            重置播放器
          </Button>

          {enableAudioFallback && (
            <Button onClick={onFallbackMode} variant="outline" className="w-full">
              <Play className="mr-2 h-4 w-4" />
              备用模式
            </Button>
          )}

          {audioFile && onDownloadFile && (
            <Button onClick={onDownloadFile} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              下载文件
            </Button>
          )}
        </div>

        {/* Recovery Progress */}
        {isRecovering && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin">
                <RotateCcw className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-800">
                正在尝试修复播放器问题... (尝试 {recoveryAttempts + 1}/3)
              </span>
            </div>
          </div>
        )}

        {/* Error Suggestions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">可能的解决方案：</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {getErrorSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Offline Mode Info */}
        {enableOfflineMode && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-green-600">📱</div>
              <span className="text-green-800 text-sm">
                离线模式已启用 - 您可以在没有网络连接的情况下继续使用部分功能。
              </span>
            </div>
          </div>
        )}

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
                    isAudioError,
                    audioFile,
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
// MOBILE PLAYER ERROR FALLBACK
// ============================================================================

const MobilePlayerErrorFallback: React.FC<PlayerErrorFallbackProps> = ({
  error,
  audioFile,
  onRetry,
  onFallbackMode,
  onDownloadFile,
  onReset,
  enableOfflineMode,
  enableAudioFallback,
}) => {
  const isAudioError = error.message.toLowerCase().includes("audio");

  return (
    <div className="p-4 space-y-4">
      <div className="text-center space-y-2">
        <VolumeX className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="font-semibold text-lg">播放器错误</h3>
        <p className="text-muted-foreground text-sm">
          {isAudioError ? "音频播放遇到问题" : "播放器出现错误"}
        </p>
      </div>

      {audioFile && (
        <div className="rounded-md bg-muted p-3">
          <p className="font-medium text-sm text-center">{audioFile.name}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onRetry} size="sm" className="w-full">
          <RotateCcw className="mr-1 h-3 w-3" />
          重试
        </Button>
        <Button onClick={onReset} variant="outline" size="sm" className="w-full">
          重置
        </Button>
        {enableAudioFallback && (
          <Button onClick={onFallbackMode} variant="outline" size="sm" className="w-full">
            <Play className="mr-1 h-3 w-3" />
            备用模式
          </Button>
        )}
        {audioFile && onDownloadFile && (
          <Button onClick={onDownloadFile} variant="outline" size="sm" className="w-full">
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
        )}
      </div>

      <div className="text-center">
        <p className="text-muted-foreground text-xs">
          尝试检查网络连接或使用备用播放模式
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

export const AudioPlayerErrorBoundary: React.FC<{ children: ReactNode; audioFile?: any }> = ({
  children,
  audioFile,
}) => (
  <PlayerErrorBoundary
    audioFile={audioFile}
    enableOfflineMode={true}
    enableAudioFallback={true}
    showDetails={false}
    allowReport={false}
  >
    {children}
  </PlayerErrorBoundary>
);

export const VideoPlayerErrorBoundary: React.FC<{ children: ReactNode; videoFile?: any }> = ({
  children,
  videoFile,
}) => (
  <PlayerErrorBoundary
    audioFile={videoFile}
    enableOfflineMode={false}
    enableAudioFallback={true}
    showDetails={false}
    allowReport={false}
    fallbackMessage="视频播放遇到问题，请尝试刷新页面或检查网络连接"
  >
    {children}
  </PlayerErrorBoundary>
);
