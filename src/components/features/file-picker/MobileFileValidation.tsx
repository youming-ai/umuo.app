"use client";

import React, { useMemo, useCallback } from "react";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  FileAudio,
  FileVideo,
  FileImage,
  FileText,
  Clock,
  Wifi,
  WifiOff,
  Smartphone,
  Battery,
  Zap,
  Shield,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Settings,
  RefreshCw
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useDeviceCapabilities } from "./hooks/useDeviceCapabilities";
import { useBatteryStatus } from "./hooks/useBatteryStatus";
import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_DOCUMENT_FORMATS,
  type FileValidationResult,
  type FileValidationOptions
} from "@/components/features/file-upload/FileValidation";

interface MobileFileValidationProps {
  files: File[];
  validationOptions?: FileValidationOptions;
  mobileOptimized?: boolean;
  showRecommendations?: boolean;
  showNetworkOptimizations?: boolean;
  showBatteryOptimizations?: boolean;
  autoOptimize?: boolean;
}

interface MobileValidationOptions extends FileValidationOptions {
  // Network-based optimizations
  enableNetworkOptimizations?: boolean;
  preferWifi?: boolean;
  maxCellularSize?: number;
  adaptiveQuality?: boolean;

  // Battery-based optimizations
  enableBatteryOptimizations?: boolean;
  lowBatteryThreshold?: number;
  conservePowerMode?: boolean;

  // Device-specific optimizations
  enableDeviceOptimizations?: boolean;
  considerStorage?: boolean;
  considerMemory?: boolean;

  // Performance optimizations
  enableCompression?: boolean;
  enableResizing?: boolean;
  enableFormatConversion?: boolean;
  targetQuality?: "low" | "medium" | "high";
}

interface FileOptimization {
  type: "compression" | "resize" | "format" | "quality";
  description: string;
  impact: "low" | "medium" | "high";
  savings: {
    size?: number;
    uploadTime?: number;
    battery?: number;
  };
  recommended: boolean;
  autoApply?: boolean;
}

interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalSize: number;
  estimatedUploadTime: number;
  estimatedBatteryUsage: number;
  optimizations: FileOptimization[];
  warnings: string[];
}

const MOBILE_SPECIFIC_FORMATS = {
  // Mobile-optimized audio formats
  "audio/amr": { ext: ".amr", name: "AMR Audio", mobile: true, quality: "low" },
  "audio/3gpp": { ext: ".3gp", name: "3GPP Audio", mobile: true, quality: "medium" },
  "audio/mp4": { ext: ".m4a", name: "M4A Audio", mobile: true, quality: "high" },

  // Mobile-optimized video formats
  "video/3gpp": { ext: ".3gp", name: "3GPP Video", mobile: true, quality: "low" },
  "video/mp4": { ext: ".mp4", name: "MP4 Video", mobile: true, quality: "high" },
  "video/quicktime": { ext: ".mov", name: "QuickTime", mobile: true, quality: "high" },

  // Mobile image formats
  "image/heic": { ext: ".heic", name: "HEIC Image", mobile: true, quality: "high" },
  "image/heif": { ext: ".heif", name: "HEIF Image", mobile: true, quality: "high" },
  "image/webp": { ext: ".webp", name: "WebP Image", mobile: true, quality: "medium" },
};

const QUALITY_PRESETS = {
  low: {
    audio: { bitrate: 64000, sampleRate: 22050 },
    video: { width: 640, height: 480, bitrate: 500000 },
    image: { quality: 0.6, maxWidth: 1024, maxHeight: 1024 }
  },
  medium: {
    audio: { bitrate: 128000, sampleRate: 44100 },
    video: { width: 1280, height: 720, bitrate: 2000000 },
    image: { quality: 0.8, maxWidth: 1920, maxHeight: 1080 }
  },
  high: {
    audio: { bitrate: 320000, sampleRate: 48000 },
    video: { width: 1920, height: 1080, bitrate: 5000000 },
    image: { quality: 0.9, maxWidth: 4096, maxHeight: 4096 }
  }
};

const NETWORK_THRESHOLDS = {
  'slow-2g': { maxFileSize: 5 * 1024 * 1024, recommendedQuality: 'low' as const },
  '2g': { maxFileSize: 10 * 1024 * 1024, recommendedQuality: 'low' as const },
  '3g': { maxFileSize: 50 * 1024 * 1024, recommendedQuality: 'medium' as const },
  '4g': { maxFileSize: 100 * 1024 * 1024, recommendedQuality: 'high' as const },
  '5g': { maxFileSize: 500 * 1024 * 1024, recommendedQuality: 'high' as const },
};

export function useMobileFileValidation(options: MobileValidationOptions = {}) {
  const {
    enableNetworkOptimizations = true,
    preferWifi = true,
    maxCellularSize = 50 * 1024 * 1024,
    adaptiveQuality = true,
    enableBatteryOptimizations = true,
    lowBatteryThreshold = 20,
    conservePowerMode = false,
    enableDeviceOptimizations = true,
    considerStorage = true,
    considerMemory = true,
    enableCompression = true,
    enableResizing = true,
    enableFormatConversion = true,
    targetQuality = "medium",
    ...validationOptions
  } = options;

  const { isOnline, connectionType, effectiveType, downlink } = useNetworkStatus();
  const {
    deviceMemory,
    storageQuota,
    platform,
    isLowEndDevice
  } = useDeviceCapabilities();
  const { level: batteryLevel, charging: isCharging } = useBatteryStatus();

  // Get network-based recommendations
  const getNetworkRecommendations = useCallback(() => {
    if (!enableNetworkOptimizations || !isOnline) return [];

    const recommendations: FileOptimization[] = [];
    const threshold = NETWORK_THRESHOLDS[effectiveType as keyof typeof NETWORK_THRESHOLDS] ||
                    NETWORK_THRESHOLDS['4g'];

    // File size recommendations based on network
    if (preferWifi && connectionType !== 'wifi') {
      recommendations.push({
        type: "quality",
        description: "Consider reducing quality for cellular network",
        impact: "medium",
        savings: { uploadTime: 60, battery: 30 },
        recommended: true,
        autoApply: adaptiveQuality
      });
    }

    // Network speed recommendations
    if (downlink < 1) { // Less than 1 Mbps
      recommendations.push({
        type: "compression",
        description: "Enable compression for slow networks",
        impact: "high",
        savings: { uploadTime: 70, size: 50 },
        recommended: true,
        autoApply: enableCompression
      });
    }

    return recommendations;
  }, [
    enableNetworkOptimizations,
    isOnline,
    preferWifi,
    connectionType,
    effectiveType,
    downlink,
    adaptiveQuality,
    enableCompression
  ]);

  // Get battery-based recommendations
  const getBatteryRecommendations = useCallback(() => {
    if (!enableBatteryOptimizations) return [];

    const recommendations: FileOptimization[] = [];
    const isLowBattery = batteryLevel < lowBatteryThreshold;

    if (isLowBattery && !isCharging) {
      recommendations.push({
        type: "quality",
        description: "Reduce quality to conserve battery",
        impact: "medium",
        savings: { battery: 40 },
        recommended: true,
        autoApply: conservePowerMode
      });
    }

    if (conservePowerMode) {
      recommendations.push({
        type: "compression",
        description: "Enable compression to save power",
        impact: "low",
        savings: { battery: 20 },
        recommended: true,
        autoApply: true
      });
    }

    return recommendations;
  }, [
    enableBatteryOptimizations,
    batteryLevel,
    lowBatteryThreshold,
    isCharging,
    conservePowerMode
  ]);

  // Get device-specific recommendations
  const getDeviceRecommendations = useCallback(() => {
    if (!enableDeviceOptimizations) return [];

    const recommendations: FileOptimization[] = [];

    // Memory considerations
    if (considerMemory && deviceMemory && deviceMemory < 4) { // Less than 4GB RAM
      recommendations.push({
        type: "quality",
        description: "Reduce quality for low-memory devices",
        impact: "medium",
        savings: { battery: 15 },
        recommended: true,
        autoApply: isLowEndDevice
      });
    }

    // Storage considerations
    if (considerStorage && storageQuota && storageQuota.available < 1024 * 1024 * 1024) { // Less than 1GB available
      recommendations.push({
        type: "compression",
        description: "Compress files to save storage space",
        impact: "high",
        savings: { size: 60 },
        recommended: true,
        autoApply: enableCompression
      });
    }

    return recommendations;
  }, [
    enableDeviceOptimizations,
    considerMemory,
    considerStorage,
    deviceMemory,
    storageQuota,
    isLowEndDevice,
    enableCompression
  ]);

  // Validate single file with mobile optimizations
  const validateFileMobile = useCallback((file: File): FileValidationResult & { optimizations: FileOptimization[] } => {
    // Basic validation first
    const basicValidation = validateFile(file, validationOptions);

    // Get file-specific optimizations
    const optimizations: FileOptimization[] = [];

    // Audio optimizations
    if (file.type.startsWith("audio/")) {
      if (enableCompression && file.size > 10 * 1024 * 1024) { // > 10MB
        optimizations.push({
          type: "compression",
          description: "Compress audio to reduce file size",
          impact: "medium",
          savings: { size: 40 },
          recommended: true,
          autoApply: false
        });
      }

      if (enableFormatConversion && !MOBILE_SPECIFIC_FORMATS[file.type as keyof typeof MOBILE_SPECIFIC_FORMATS]?.mobile) {
        optimizations.push({
          type: "format",
          description: "Convert to mobile-optimized format (M4A)",
          impact: "medium",
          savings: { size: 30, uploadTime: 25 },
          recommended: true,
          autoApply: false
        });
      }
    }

    // Video optimizations
    if (file.type.startsWith("video/")) {
      if (enableResizing && file.size > 50 * 1024 * 1024) { // > 50MB
        optimizations.push({
          type: "resize",
          description: "Reduce video resolution for mobile",
          impact: "high",
          savings: { size: 60, uploadTime: 50, battery: 30 },
          recommended: true,
          autoApply: false
        });
      }

      if (enableCompression) {
        optimizations.push({
          type: "compression",
          description: "Compress video to reduce bandwidth usage",
          impact: "high",
          savings: { size: 50, uploadTime: 45 },
          recommended: true,
          autoApply: adaptiveQuality
        });
      }
    }

    // Image optimizations
    if (file.type.startsWith("image/")) {
      if (enableResizing && file.size > 5 * 1024 * 1024) { // > 5MB
        optimizations.push({
          type: "resize",
          description: "Resize image for mobile viewing",
          impact: "medium",
          savings: { size: 70 },
          recommended: true,
          autoApply: false
        });
      }

      if (enableFormatConversion && file.type === "image/png") {
        optimizations.push({
          type: "format",
          description: "Convert PNG to WebP for better compression",
          impact: "medium",
          savings: { size: 25 },
          recommended: true,
          autoApply: false
        });
      }
    }

    return {
      ...basicValidation,
      optimizations
    };
  }, [validationOptions, enableCompression, enableResizing, enableFormatConversion, adaptiveQuality]);

  // Get overall validation summary
  const getValidationSummary = useCallback((files: File[]): ValidationSummary => {
    const results = files.map(validateFileMobile);
    const validFiles = results.filter(r => r.isValid);
    const invalidFiles = results.filter(r => !r.isValid);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Estimate upload time based on network
    const estimatedUploadTime = isOnline && downlink
      ? (totalSize * 8) / (downlink * 1000000) // Convert to seconds
      : 0;

    // Estimate battery usage (rough calculation)
    const estimatedBatteryUsage = isOnline
      ? Math.min(5, (totalSize / (1024 * 1024 * 100)) * (connectionType === 'wifi' ? 1 : 3))
      : 0;

    // Get all optimizations
    const allOptimizations = [
      ...getNetworkRecommendations(),
      ...getBatteryRecommendations(),
      ...getDeviceRecommendations(),
      ...results.flatMap(r => r.optimizations)
    ];

    // Generate warnings
    const warnings: string[] = [];
    if (!isOnline) warnings.push("Device is offline - uploads will queue");
    if (connectionType !== 'wifi' && totalSize > maxCellularSize) {
      warnings.push("Large files detected on cellular network");
    }
    if (batteryLevel < lowBatteryThreshold && !isCharging) {
      warnings.push("Low battery detected - uploads may consume significant power");
    }
    if (isLowEndDevice && files.some(f => f.size > 50 * 1024 * 1024)) {
      warnings.push("Large files may cause performance issues on this device");
    }

    return {
      totalFiles: files.length,
      validFiles: validFiles.length,
      invalidFiles: invalidFiles.length,
      totalSize,
      estimatedUploadTime,
      estimatedBatteryUsage,
      optimizations: allOptimizations,
      warnings
    };
  }, [
    validateFileMobile,
    isOnline,
    downlink,
    connectionType,
    batteryLevel,
    lowBatteryThreshold,
    isCharging,
    isLowEndDevice,
    maxCellularSize,
    getNetworkRecommendations,
    getBatteryRecommendations,
    getDeviceRecommendations
  ]);

  return {
    validateFileMobile,
    getValidationSummary,
    getNetworkRecommendations,
    getBatteryRecommendations,
    getDeviceRecommendations
  };
}

// Import the validateFile function from the existing validation
function validateFile(file: File, options: FileValidationOptions): FileValidationResult {
  // This would import from the existing FileValidation.tsx
  // For now, returning a basic implementation
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  const allFormats = { ...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS, ...SUPPORTED_DOCUMENT_FORMATS };
  const isSupported = !!allFormats[file.type as keyof typeof allFormats];

  if (!isSupported) {
    errors.push(`Unsupported file format: ${file.type}`);
  }

  return {
    isValid: errors.length === 0 && isSupported,
    errors,
    warnings,
    fileType: isSupported ?
      (file.type in SUPPORTED_AUDIO_FORMATS ? 'audio' :
       file.type in SUPPORTED_VIDEO_FORMATS ? 'video' : 'document') : 'unsupported'
  };
}

export default function MobileFileValidation({
  files,
  validationOptions,
  mobileOptimized = true,
  showRecommendations = true,
  showNetworkOptimizations = true,
  showBatteryOptimizations = true,
  autoOptimize = false
}: MobileFileValidationProps) {
  const {
    validateFileMobile,
    getValidationSummary,
    getNetworkRecommendations,
    getBatteryRecommendations
  } = useMobileFileValidation({
    ...validationOptions,
    enableNetworkOptimizations: showNetworkOptimizations,
    enableBatteryOptimizations: showBatteryOptimizations,
    enableCompression: autoOptimize,
    enableResizing: autoOptimize,
    adaptiveQuality: autoOptimize
  });

  const summary = useMemo(() =>
    getValidationSummary(files),
    [files, getValidationSummary]
  );

  const renderStatusBadge = (status: "valid" | "invalid" | "warning") => {
    const variants = {
      valid: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      invalid: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      warning: { variant: "secondary" as const, icon: AlertTriangle, color: "text-yellow-600" }
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderOptimization = (optimization: FileOptimization, index: number) => {
    const impactColors = {
      low: "text-blue-600",
      medium: "text-yellow-600",
      high: "text-red-600"
    };

    return (
      <Card key={index} className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {optimization.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${impactColors[optimization.impact]} border-current`}
                >
                  {optimization.impact} impact
                </Badge>
                {optimization.recommended && (
                  <Badge variant="secondary">Recommended</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{optimization.description}</p>

              {(optimization.savings.size || optimization.savings.uploadTime || optimization.savings.battery) && (
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {optimization.savings.size && (
                    <span>Save {optimization.savings.size}% size</span>
                  )}
                  {optimization.savings.uploadTime && (
                    <span>Save {optimization.savings.uploadTime}% upload time</span>
                  )}
                  {optimization.savings.battery && (
                    <span>Save {optimization.savings.battery}% battery</span>
                  )}
                </div>
              )}
            </div>

            {optimization.autoApply && (
              <Badge variant="default" className="ml-2">
                Auto
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`mobile-file-validation ${mobileOptimized ? "mobile-optimized" : ""} space-y-4`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.totalFiles}</div>
            <div className="text-sm text-gray-500">Total Files</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.validFiles}</div>
            <div className="text-sm text-gray-500">Valid</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.invalidFiles}</div>
            <div className="text-sm text-gray-500">Invalid</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(summary.totalSize / (1024 * 1024)).toFixed(1)}MB
            </div>
            <div className="text-sm text-gray-500">Total Size</div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                <ul className="space-y-1">
                  {summary.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Recommendations */}
      {showRecommendations && summary.optimizations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Optimizations</h3>
            <Badge variant="outline">
              {summary.optimizations.length} recommendations
            </Badge>
          </div>

          <div className="space-y-2">
            {summary.optimizations.map(renderOptimization)}
          </div>
        </div>
      )}

      {/* Network Status */}
      {showNetworkOptimizations && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                <div>
                  <div className="font-medium">Network Status</div>
                  <div className="text-sm text-gray-500">
                    {isOnline ? `${connectionType} (${effectiveType})` : "Offline"}
                  </div>
                </div>
              </div>

              {summary.estimatedUploadTime > 0 && (
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ~{Math.round(summary.estimatedUploadTime / 60)}min upload
                  </div>
                  <div className="text-xs text-gray-500">
                    {downlink ? `${downlink} Mbps` : "Unknown speed"}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battery Status */}
      {showBatteryOptimizations && summary.estimatedBatteryUsage > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="w-5 h-5" />
                <div>
                  <div className="font-medium">Battery Impact</div>
                  <div className="text-sm text-gray-500">
                    Est. {summary.estimatedBatteryUsage.toFixed(1)}% consumption
                  </div>
                </div>
              </div>

              <Progress
                value={summary.estimatedBatteryUsage * 20}
                className="w-20"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        .mobile-file-validation.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .mobile-file-validation button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
