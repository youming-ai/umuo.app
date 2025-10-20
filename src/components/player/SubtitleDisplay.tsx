"use client";
import { BookOpen, Clock, RotateCcw, Settings, SkipBack, SkipForward } from "lucide-react";
import React, { useCallback, useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { type Subtitle, type SubtitleState, SubtitleSynchronizer } from "@/lib/subtitle-sync";
import { WordTimestampService } from "@/lib/word-timestamp-service";
import type { Segment } from "@/types/database";

interface SubtitleDisplayProps {
  segments: Segment[];
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  showTranslation?: boolean;
  className?: string;
}

const SubtitleDisplay = React.memo<SubtitleDisplayProps>(
  ({ segments, currentTime, onSeek, showTranslation = true, className = "" }) => {
    const [subtitleState, setSubtitleState] = useState<SubtitleState>({
      currentSubtitle: null,
      upcomingSubtitles: [],
      previousSubtitles: [],
      allSubtitles: [],
    });

    const [synchronizer, setSynchronizer] = useState<SubtitleSynchronizer | null>(null);

    const safeCurrentTime =
      Number.isFinite(currentTime) && !Number.isNaN(currentTime) ? currentTime : 0;

    // Generate unique IDs for form controls
    const fontSizeId = useId();
    const lineHeightId = useId();
    const settingsPanelId = useId();
    const [currentWord, setCurrentWord] = useState<{
      word: string;
      index: number;
    } | null>(null);

    // 字幕显示设置
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState([18]);
    const [lineHeight, setLineHeight] = useState([1.8]);

    // Memoize format time function
    const formatTime = useCallback((seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);

      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    }, []);

    // Memoize click handlers
    const handleWordClick = useCallback(
      (startTime: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (onSeek) {
          onSeek(startTime);
        }
      },
      [onSeek],
    );

    const handleWordKeyDown = useCallback(
      (event: React.KeyboardEvent, startTime: number) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (onSeek) {
            onSeek(startTime);
          }
        }
      },
      [onSeek],
    );

    // 字幕导航功能
    const navigateToPreviousSubtitle = useCallback(() => {
      if (subtitleState.previousSubtitles.length > 0) {
        const previousSubtitle =
          subtitleState.previousSubtitles[subtitleState.previousSubtitles.length - 1];
        onSeek?.(previousSubtitle.start);
      }
    }, [subtitleState.previousSubtitles, onSeek]);

    const navigateToNextSubtitle = useCallback(() => {
      if (subtitleState.upcomingSubtitles.length > 0) {
        const nextSubtitle = subtitleState.upcomingSubtitles[0];
        onSeek?.(nextSubtitle.start);
      }
    }, [subtitleState.upcomingSubtitles, onSeek]);

    const navigateToCurrentSubtitle = useCallback(() => {
      if (subtitleState.currentSubtitle) {
        onSeek?.(subtitleState.currentSubtitle.start);
      }
    }, [subtitleState.currentSubtitle, onSeek]);

    useEffect(() => {
      if (segments.length > 0) {
        const sync = new SubtitleSynchronizer(segments, {
          preloadTime: 2.0, // 增加预加载时间，让字幕提前显示
          postloadTime: 1.0, // 增加后加载时间，让字幕停留更久
          syncThreshold: 0.05, // 减少同步阈值，提高精度
          maxSubtitles: 5, // 增加同时显示的字幕数量
        });

        sync.onUpdate(setSubtitleState);
        setSynchronizer(sync);

        return () => {
          sync.destroy();
        };
      }
    }, [segments]);

    useEffect(() => {
      if (synchronizer) {
        synchronizer.updateTime(safeCurrentTime);
      }
    }, [safeCurrentTime, synchronizer]);

    // Update current word based on playback time
    useEffect(() => {
      if (subtitleState.currentSubtitle?.wordTimestamps) {
        const currentWord = WordTimestampService.getCurrentWord(
          safeCurrentTime,
          subtitleState.currentSubtitle.wordTimestamps,
        );
        setCurrentWord(currentWord);
      } else {
        setCurrentWord(null);
      }
    }, [safeCurrentTime, subtitleState.currentSubtitle]);

    // Memoize subtitle word rendering to prevent unnecessary re-renders
    const renderSubtitleWords = useCallback(
      (subtitle: Subtitle, isActive: boolean = false) => {
        // 优先使用标准化文本，否则使用原始文本
        const displayText = subtitle.normalizedText || subtitle.text;
        const words = displayText.split(" ");

        return words.map((word, index) => {
          const isCurrentWord = currentWord?.index === index;
          const wordStartTime = subtitle.start + (subtitle.wordTimestamps?.[index]?.start || 0);

          return (
            <button
              key={`${subtitle.start}-${index}`}
              type="button"
              onClick={(e) => handleWordClick(wordStartTime, e)}
              onKeyDown={(e) => handleWordKeyDown(e, wordStartTime)}
              className={`cursor-pointer select-none rounded px-1 py-0.5 transition-all duration-200 hover:scale-105 ${
                isActive && isCurrentWord
                  ? "scale-105 bg-[var(--button-fill-hover)] font-bold text-[var(--color-primary)]"
                  : isActive
                    ? "font-medium text-foreground hover:text-[var(--color-primary)]"
                    : "text-muted-foreground hover:text-foreground"
              }
              `}
              style={{
                fontSize: isActive ? `${fontSize[0]}px` : `${fontSize[0] - 2}px`,
                lineHeight: `${lineHeight[0]}`,
              }}
            >
              {word}
              {index < words.length - 1 && " "}
            </button>
          );
        });
      },
      [currentWord, fontSize, lineHeight, handleWordClick, handleWordKeyDown],
    );

    // 渲染带有假名读音的字幕
    const renderFuriganaText = useCallback(
      (subtitle: Subtitle, isActive: boolean = false) => {
        // 如果有假名读音数据，使用它
        if (subtitle.furigana) {
          return (
            <div className="mb-2">
              <ruby
                className={`text-lg ${isActive ? "text-[var(--color-primary)] font-bold" : "text-foreground"}`}
                style={{
                  fontSize: isActive ? `${fontSize[0]}px` : `${fontSize[0] - 2}px`,
                  lineHeight: `${lineHeight[0]}`,
                  rubyAlign: "center",
                }}
              >
                {subtitle.text}
                <rt className="text-xs text-muted-foreground">{subtitle.furigana}</rt>
              </ruby>
            </div>
          );
        }

        // 没有假名时显示普通文本
        return (
          <div
            className={`mb-2 ${isActive ? "text-[var(--color-primary)] font-bold" : "text-foreground"}`}
            style={{
              fontSize: isActive ? `${fontSize[0]}px` : `${fontSize[0] - 2}px`,
              lineHeight: `${lineHeight[0]}`,
            }}
          >
            {subtitle.normalizedText || subtitle.text}
          </div>
        );
      },
      [fontSize, lineHeight],
    );

    if (segments.length === 0) {
      return (
        <output
          className={`rounded-lg bg-muted/20 p-8 text-center block ${className}`}
          aria-live="polite"
        >
          <div className="text-muted-foreground">
            <p className="mb-2 font-medium text-lg" aria-live="polite">
              没有可用的字幕
            </p>
            <p className="text-sm">上传音频文件并转录以在此处查看字幕。</p>
          </div>
        </output>
      );
    }

    return (
      <section
        className={`space-y-4 rounded-lg bg-background p-6 shadow-lg ${className}`}
        aria-label="字幕显示和控制面板"
      >
        {/* 顶部控制栏 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-primary/20 bg-background/95 p-4 backdrop-blur-sm"
          role="toolbar"
          aria-label="字幕控制工具栏"
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-foreground hover:bg-primary/20"
              aria-label={showSettings ? "隐藏字幕设置" : "显示字幕设置"}
              aria-expanded={showSettings}
              aria-controls="subtitle-settings-panel"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">字幕设置</span>
            </Button>
            <Badge variant="outline" className="border-primary/50 text-foreground text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {subtitleState.allSubtitles.length} 个字幕
            </Badge>
            {subtitleState.currentSubtitle && (
              <Badge variant="secondary" className="bg-primary/20 text-foreground text-xs">
                {formatTime(subtitleState.currentSubtitle.start)}
              </Badge>
            )}
          </div>

          <fieldset
            className="flex items-center space-x-1 border-0 p-0 m-0"
            aria-label="字幕导航控制"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToPreviousSubtitle}
              disabled={!subtitleState.previousSubtitles.length}
              className="h-8 w-8 p-0 text-foreground hover:bg-primary/20 disabled:opacity-50"
              aria-label="上一个字幕"
              aria-disabled={!subtitleState.previousSubtitles.length}
            >
              <SkipBack className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">上一个字幕</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToCurrentSubtitle}
              disabled={!subtitleState.currentSubtitle}
              className="h-8 w-8 p-0 text-foreground hover:bg-primary/20 disabled:opacity-50"
              aria-label="当前字幕"
              aria-disabled={!subtitleState.currentSubtitle}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">当前字幕</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToNextSubtitle}
              disabled={!subtitleState.upcomingSubtitles.length}
              className="h-8 w-8 p-0 text-foreground hover:bg-primary/20 disabled:opacity-50"
              aria-label="下一个字幕"
              aria-disabled={!subtitleState.upcomingSubtitles.length}
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">下一个字幕</span>
            </Button>
          </fieldset>
        </div>

        {/* 字幕列表 - 平铺显示 */}
        <ul
          className="max-h-96 space-y-3 overflow-y-auto rounded-lg border bg-muted/5 p-4 list-none m-0"
          aria-label="字幕列表"
        >
          {subtitleState.previousSubtitles.map((subtitle, _index) => (
            <button
              key={`prev-${subtitle.start}`}
              type="button"
              className="cursor-pointer rounded-lg bg-muted/20 p-3 transition-colors hover:bg-muted/30"
              onClick={() => onSeek?.(subtitle.start)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeek?.(subtitle.start);
                }
              }}
              aria-label={`上一个字幕: ${subtitle.text.substring(0, 50)}${subtitle.text.length > 50 ? "..." : ""}`}
              aria-describedby={`prev-time-${subtitle.start}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span
                  id={`prev-time-${subtitle.start}`}
                  className="font-mono text-muted-foreground text-xs"
                  aria-label={`时间: ${formatTime(subtitle.start)}`}
                >
                  {formatTime(subtitle.start)}
                </span>
              </div>
              <div className="mb-2">
                {renderFuriganaText(subtitle, false)}
                <div className="flex flex-wrap gap-1">{renderSubtitleWords(subtitle, false)}</div>
              </div>
              {showTranslation && subtitle.translation && (
                <div
                  className="mt-2 text-muted-foreground text-sm border-t border-border/50 pt-2"
                  aria-label={`翻译: ${subtitle.translation}`}
                >
                  <span className="text-xs text-muted-foreground mr-2">🌐</span>
                  {subtitle.translation}
                </div>
              )}
            </button>
          ))}

          {subtitleState.currentSubtitle && (
            <button
              key={`current-${subtitleState.currentSubtitle.start}`}
              type="button"
              className="rounded-lg border-2 border-primary bg-primary/5 p-4 shadow-sm transition-all hover:bg-primary/10"
              onClick={() =>
                subtitleState.currentSubtitle && onSeek?.(subtitleState.currentSubtitle.start)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  subtitleState.currentSubtitle && onSeek?.(subtitleState.currentSubtitle.start);
                }
              }}
              aria-label={`当前字幕: ${subtitleState.currentSubtitle.text.substring(0, 50)}${subtitleState.currentSubtitle.text.length > 50 ? "..." : ""}`}
              aria-describedby={`current-time-${subtitleState.currentSubtitle.start}`}
              aria-current="true"
            >
              <div className="mb-3 flex items-start justify-between">
                <span
                  id={`current-time-${subtitleState.currentSubtitle.start}`}
                  className="font-medium font-mono text-[var(--color-primary)] text-xs"
                  aria-label={`当前时间: ${formatTime(subtitleState.currentSubtitle.start)}`}
                >
                  {formatTime(subtitleState.currentSubtitle.start)}
                </span>
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-primary"
                  aria-hidden="true"
                  title="正在播放"
                />
              </div>
              <div className="mb-3" aria-label="字幕内容">
                {renderFuriganaText(subtitleState.currentSubtitle, true)}
                {/* 保留单词级点击功能 */}
                <div className="flex flex-wrap gap-1">
                  {renderSubtitleWords(subtitleState.currentSubtitle, true)}
                </div>
              </div>
              {showTranslation && subtitleState.currentSubtitle.translation && (
                <div
                  className="font-medium text-[var(--color-primary)] text-sm border-t border-primary/20 pt-2"
                  aria-label={`翻译: ${subtitleState.currentSubtitle.translation}`}
                >
                  <span className="text-xs text-muted-foreground mr-2">🌐</span>
                  {subtitleState.currentSubtitle.translation}
                </div>
              )}
            </button>
          )}

          {subtitleState.upcomingSubtitles.map((subtitle, _index) => (
            <button
              key={`next-${subtitle.start}`}
              type="button"
              className="cursor-pointer rounded-lg bg-muted/10 p-3 opacity-70 transition-colors hover:bg-muted/20"
              onClick={() => onSeek?.(subtitle.start)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeek?.(subtitle.start);
                }
              }}
              aria-label={`即将播放的字幕: ${subtitle.text.substring(0, 50)}${subtitle.text.length > 50 ? "..." : ""}`}
              aria-describedby={`next-time-${subtitle.start}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span
                  id={`next-time-${subtitle.start}`}
                  className="font-mono text-muted-foreground text-xs"
                  aria-label={`时间: ${formatTime(subtitle.start)}`}
                >
                  {formatTime(subtitle.start)}
                </span>
              </div>
              <div className="mb-2">
                {renderFuriganaText(subtitle, false)}
                <div className="flex flex-wrap gap-1" aria-label="字幕内容">
                  {renderSubtitleWords(subtitle, false)}
                </div>
              </div>
              {showTranslation && subtitle.translation && (
                <div
                  className="mt-2 text-muted-foreground text-sm border-t border-border/50 pt-2"
                  aria-label={`翻译: ${subtitle.translation}`}
                >
                  <span className="text-xs text-muted-foreground mr-2">🌐</span>
                  {subtitle.translation}
                </div>
              )}
            </button>
          ))}
        </ul>

        {/* 设置面板 */}
        {showSettings && (
          <Card
            id={settingsPanelId}
            className="w-full max-w-md p-4"
            role="dialog"
            aria-label="字幕设置对话框"
            aria-modal="true"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center font-medium text-sm">
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  字幕设置
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  aria-label="关闭设置"
                >
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">关闭设置</span>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor={fontSizeId} className="font-medium text-sm">
                    字体大小
                  </label>
                  <Slider
                    id={fontSizeId}
                    value={fontSize}
                    min={14}
                    max={28}
                    step={1}
                    onValueChange={setFontSize}
                    className="w-full"
                  />
                  <span className="text-muted-foreground text-xs">{fontSize[0]}px</span>
                </div>

                <div className="space-y-2">
                  <label htmlFor={lineHeightId} className="font-medium text-sm">
                    行高
                  </label>
                  <Slider
                    id={lineHeightId}
                    value={lineHeight}
                    min={1.2}
                    max={2.5}
                    step={0.1}
                    onValueChange={setLineHeight}
                    className="w-full"
                  />
                  <span className="text-muted-foreground text-xs">{lineHeight[0]}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </section>
    );
  },
);

SubtitleDisplay.displayName = "SubtitleDisplay";

export default SubtitleDisplay;
