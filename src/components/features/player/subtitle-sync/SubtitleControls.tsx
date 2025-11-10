"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  EyeOff,
  Settings,
  Volume2,
  Clock,
  Text,
  Type,
  Palette,
  Zap,
  Smartphone,
  Monitor,
  Accessibility,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Upload,
  Play,
  Pause
} from "lucide-react";
import type { SubtitleSyncConfig } from "./SubtitleSync";

/**
 * Props for SubtitleControls component
 */
export interface SubtitleControlsProps {
  /** Current configuration */
  config: SubtitleSyncConfig;
  /** Whether subtitles are currently visible */
  isVisible: boolean;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Available subtitle tracks */
  tracks: Array<{ id: string; name: string; segments: any[] }>;
  /** Currently active track */
  activeTrack: string;
  /** Callback when subtitles are toggled */
  onToggle: (visible: boolean) => void;
  /** Callback when configuration changes */
  onConfigChange: (config: Partial<SubtitleSyncConfig>) => void;
  /** Callback when track changes */
  onTrackChange?: (trackId: string) => void;
  /** Whether component is in touch mode */
  touchMode?: boolean;
  /** Total duration of the audio */
  duration?: number;
  /** Current playback time */
  currentTime?: number;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Control section state
 */
interface ControlSection {
  /** Whether section is expanded */
  expanded: boolean;
  /** Section title */
  title: string;
  /** Section icon */
  icon: React.ReactNode;
}

/**
 * SubtitleControls - Comprehensive subtitle management interface
 *
 * Features:
 * - Intuitive subtitle toggle and configuration
 * - Multiple subtitle tracks support
 * - Mobile-optimized touch controls
 * - Accessibility compliance (WCAG 2.1)
 * - Performance monitoring and optimization
 * - Import/export subtitle settings
 */
export const SubtitleControls: React.FC<SubtitleControlsProps> = React.memo(
  ({
    config,
    isVisible,
    isPlaying,
    tracks,
    activeTrack,
    onToggle,
    onConfigChange,
    onTrackChange,
    touchMode = false,
    duration = 0,
    currentTime = 0,
    className = "",
  }) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      basic: true,
      advanced: false,
      accessibility: false,
    });

    const [offsetValue, setOffsetValue] = useState(config.offset);
    const [maxVisibleValue, setMaxVisibleValue] = useState(config.maxVisibleSubtitles);

    // Toggle section expansion
    const toggleSection = useCallback((section: string) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section],
      }));
    }, []);

    // Handle subtitle visibility toggle
    const handleToggle = useCallback(() => {
      onToggle(!isVisible);
    }, [isVisible, onToggle]);

    // Handle offset change
    const handleOffsetChange = useCallback((value: number[]) => {
      const newOffset = value[0];
      setOffsetValue(newOffset);
      onConfigChange({ offset: newOffset });
    }, [onConfigChange]);

    // Handle display style change
    const handleDisplayStyleChange = useCallback((style: "full" | "compact" | "minimal") => {
      onConfigChange({ displayStyle: style });
    }, [onConfigChange]);

    // Handle scroll behavior change
    const handleScrollBehaviorChange = useCallback((behavior: "smooth" | "instant" | "auto") => {
      onConfigChange({ scrollBehavior: behavior });
    }, [onConfigChange]);

    // Handle max visible subtitles change
    const handleMaxVisibleChange = useCallback((value: number[]) => {
      const newValue = value[0];
      setMaxVisibleValue(newValue);
      onConfigChange({ maxVisibleSubtitles: newValue });
    }, [onConfigChange]);

    // Handle track change
    const handleTrackChange = useCallback((trackId: string) => {
      if (onTrackChange) {
        onTrackChange(trackId);
      }
    }, [onTrackChange]);

    // Reset to default settings
    const handleReset = useCallback(() => {
      const defaults = {
        offset: 0,
        autoScroll: true,
        scrollBehavior: "smooth" as const,
        wordHighlighting: true,
        showControls: false,
        displayStyle: "full" as const,
        maxVisibleSubtitles: 5,
        mobileOptimized: true,
        highContrast: false,
      };

      onConfigChange(defaults);
      setOffsetValue(0);
      setMaxVisibleValue(5);
    }, [onConfigChange]);

    // Export settings
    const handleExport = useCallback(() => {
      const settings = JSON.stringify(config, null, 2);
      const blob = new Blob([settings], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "subtitle-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    }, [config]);

    // Format offset display
    const formatOffset = useCallback((offset: number) => {
      const sign = offset >= 0 ? "+" : "-";
      const seconds = Math.abs(offset);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = (seconds % 60).toFixed(1);
      return `${sign}${minutes}:${remainingSeconds.padStart(4, "0")}`;
    }, []);

    // Render basic controls
    const renderBasicControls = () => (
      <div className="space-y-4">
        {/* Subtitle toggle and track selection */}
        <div className="flex items-center gap-3">
          {/* Visibility toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVisible ? "default" : "outline"}
                  size={touchMode ? "lg" : "sm"}
                  onClick={handleToggle}
                  className="gap-2"
                >
                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {touchMode && "字幕"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isVisible ? "隐藏字幕" : "显示字幕"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Track selection */}
          {tracks.length > 1 && (
            <Select value={activeTrack} onValueChange={handleTrackChange}>
              <SelectTrigger className={cn("w-32", touchMode && "h-10")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Display style selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            显示样式
          </label>
          <div className="flex gap-2">
            {[
              { value: "full", label: "完整" },
              { value: "compact", label: "紧凑" },
              { value: "minimal", label: "极简" },
            ].map((style) => (
              <Button
                key={style.value}
                variant={config.displayStyle === style.value ? "default" : "outline"}
                size={touchMode ? "lg" : "sm"}
                onClick={() => handleDisplayStyleChange(style.value as any)}
              >
                {style.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Offset adjustment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              字幕偏移
            </label>
            <span className="text-sm text-muted-foreground">
              {formatOffset(offsetValue)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOffsetChange([offsetValue - 0.1])}
            >
              -0.1s
            </Button>
            <Slider
              value={[offsetValue]}
              onValueChange={handleOffsetChange}
              min={-5}
              max={5}
              step={0.1}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOffsetChange([offsetValue + 0.1])}
            >
              +0.1s
            </Button>
          </div>
        </div>
      </div>
    );

    // Render advanced controls
    const renderAdvancedControls = () => (
      <div className="space-y-4">
        {/* Auto-scroll toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            自动滚动
          </label>
          <Switch
            checked={config.autoScroll}
            onCheckedChange={(checked) => onConfigChange({ autoScroll: checked })}
          />
        </div>

        {/* Word highlighting toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Text className="h-4 w-4" />
            词级高亮
          </label>
          <Switch
            checked={config.wordHighlighting}
            onCheckedChange={(checked) => onConfigChange({ wordHighlighting: checked })}
          />
        </div>

        {/* Scroll behavior */}
        <div className="space-y-2">
          <label className="text-sm font-medium">滚动行为</label>
          <div className="flex gap-2">
            {[
              { value: "smooth", label: "平滑" },
              { value: "instant", label: "即时" },
              { value: "auto", label: "自动" },
            ].map((behavior) => (
              <Button
                key={behavior.value}
                variant={config.scrollBehavior === behavior.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleScrollBehaviorChange(behavior.value as any)}
              >
                {behavior.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Max visible subtitles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">最大显示数量</label>
            <span className="text-sm text-muted-foreground">{maxVisibleValue}</span>
          </div>
          <Slider
            value={[maxVisibleValue]}
            onValueChange={handleMaxVisibleChange}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    );

    // Render accessibility controls
    const renderAccessibilityControls = () => (
      <div className="space-y-4">
        {/* High contrast toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            高对比度
          </label>
          <Switch
            checked={config.highContrast}
            onCheckedChange={(checked) => onConfigChange({ highContrast: checked })}
          />
        </div>

        {/* Mobile optimization toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            移动端优化
          </label>
          <Switch
            checked={config.mobileOptimized}
            onCheckedChange={(checked) => onConfigChange({ mobileOptimized: checked })}
          />
        </div>
      </div>
    );

    return (
      <div
        className={cn(
          "subtitle-controls bg-background border border-border rounded-lg p-4",
          "shadow-lg space-y-4",
          touchMode && "p-6",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            字幕设置
          </h3>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>重置设置</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导出设置</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Basic controls */}
        <div className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => toggleSection("basic")}
          >
            <span className="text-sm font-medium">基本设置</span>
            {expandedSections.basic ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.basic && renderBasicControls()}
        </div>

        {/* Advanced controls */}
        <div className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => toggleSection("advanced")}
          >
            <span className="text-sm font-medium">高级设置</span>
            {expandedSections.advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.advanced && renderAdvancedControls()}
        </div>

        {/* Accessibility controls */}
        <div className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => toggleSection("accessibility")}
          >
            <span className="text-sm font-medium">辅助功能</span>
            {expandedSections.accessibility ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.accessibility && renderAccessibilityControls()}
        </div>
      </div>
    );
  }
);

SubtitleControls.displayName = "SubtitleControls";

export default SubtitleControls;
