"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";
import { MobileDetector } from "@/types/mobile";
import type { Segment } from "@/types/db/database";

/**
 * Demo component showcasing ProgressBar functionality
 * This demonstrates integration with the audio player system
 */
export const ProgressBarDemo: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mobileDetector = MobileDetector.getInstance();
  const isMobile = mobileDetector.isMobile();

  // State management
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<Array<{ start: number; end: number }>>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [touchMode, setTouchMode] = useState(isMobile);
  const [variant, setVariant] = useState<"default" | "compact" | "minimal">("default");

  // Demo audio segments for testing
  const demoSegments: Segment[] = [
    {
      id: 1,
      transcriptId: 1,
      start: 0,
      end: 30,
      text: "Introduction to the audio content",
      normalizedText: "Introduction to the audio content",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      transcriptId: 1,
      start: 30,
      end: 90,
      text: "Main content section with detailed information",
      normalizedText: "Main content section with detailed information",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      transcriptId: 1,
      start: 90,
      end: 120,
      text: "Conclusion and summary of key points",
      normalizedText: "Conclusion and summary of key points",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Format time helper
  const formatTime = useCallback((time: number): string => {
    if (!Number.isFinite(time) || time < 0) return "00:00";
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, []);

  // Handle seeking
  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleSeekStart = useCallback(() => {
    // Pause during seek for smooth experience
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const handleSeekEnd = useCallback(() => {
    // Resume if was playing
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(() => {
        // Handle play failure silently
      });
    }
  }, [isPlaying]);

  // Play/pause controls
  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          // Handle play failure silently
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Skip forward/backward
  const handleSkip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [currentTime, duration]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const ranges: Array<{ start: number; end: number }> = [];
      for (let i = 0; i < audioRef.current.buffered.length; i++) {
        ranges.push({
          start: audioRef.current.buffered.start(i),
          end: audioRef.current.buffered.end(i),
        });
      }
      setBufferedRanges(ranges);
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Demo audio URL (using a public domain audio file)
  const demoAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  // Setup demo audio on mount
  useEffect(() => {
    // Create a mock audio element for demonstration
    const mockAudio = document.createElement("audio");
    mockAudio.src = demoAudioUrl;
    mockAudio.preload = "metadata";
    audioRef.current = mockAudio;

    // Set up event listeners
    mockAudio.addEventListener("timeupdate", handleTimeUpdate);
    mockAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    mockAudio.addEventListener("progress", handleProgress);
    mockAudio.addEventListener("loadstart", handleLoadStart);
    mockAudio.addEventListener("canplay", handleCanPlay);

    // Simulate duration for demo (since we're not actually loading the audio)
    setTimeout(() => {
      setDuration(120); // 2 minutes demo
    }, 1000);

    return () => {
      // Cleanup
      mockAudio.removeEventListener("timeupdate", handleTimeUpdate);
      mockAudio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      mockAudio.removeEventListener("progress", handleProgress);
      mockAudio.removeEventListener("loadstart", handleLoadStart);
      mockAudio.removeEventListener("canplay", handleCanPlay);
    };
  }, [
    handleTimeUpdate,
    handleLoadedMetadata,
    handleProgress,
    handleLoadStart,
    handleCanPlay,
    demoAudioUrl,
  ]);

  // Simulate playback progress for demo
  useEffect(() => {
    if (isPlaying && currentTime < duration) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTime, duration]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ProgressBar Component Demo</h1>
        <p className="text-muted-foreground">
          Demonstrating drag-to-seek functionality with visual feedback
        </p>
      </div>

      {/* Demo audio info */}
      <Card className="p-6 bg-gradient-to-br from-background to-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Demo Audio</h2>
            <p className="text-sm text-muted-foreground">
              Duration: {formatTime(duration)} | Current: {formatTime(currentTime)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSkip(-10)}>
              -10s
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSkip(10)}>
              +10s
            </Button>
          </div>
        </div>

        {/* Main ProgressBar demo */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Standard Progress Bar</h3>
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            isLoading={isLoading}
            bufferedRanges={bufferedRanges}
            segments={demoSegments}
            onSeek={handleSeek}
            onSeekStart={handleSeekStart}
            onSeekEnd={handleSeekEnd}
            showTimeDisplay={true}
            showBufferIndicator={true}
            showSegmentMarkers={true}
            touchMode={touchMode}
            maxResponseTime={200}
            variant={variant}
          />
        </div>
      </Card>

      {/* Configuration controls */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuration Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Touch Mode</label>
            <div className="flex gap-2">
              <Button
                variant={touchMode ? "default" : "outline"}
                size="sm"
                onClick={() => setTouchMode(true)}
              >
                Enabled
              </Button>
              <Button
                variant={!touchMode ? "default" : "outline"}
                size="sm"
                onClick={() => setTouchMode(false)}
              >
                Disabled
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Variant</label>
            <div className="flex gap-2">
              <Button
                variant={variant === "default" ? "default" : "outline"}
                size="sm"
                onClick={() => setVariant("default")}
              >
                Default
              </Button>
              <Button
                variant={variant === "compact" ? "default" : "outline"}
                size="sm"
                onClick={() => setVariant("compact")}
              >
                Compact
              </Button>
              <Button
                variant={variant === "minimal" ? "default" : "outline"}
                size="sm"
                onClick={() => setVariant("minimal")}
              >
                Minimal
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Feature showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-2">🎯 Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Drag-to-seek functionality</li>
            <li>• &lt;200ms response time</li>
            <li>• Mobile touch optimization</li>
            <li>• Haptic feedback integration</li>
            <li>• Buffer indicators</li>
            <li>• Segment/chapter markers</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">⚡ Performance</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• GPU-accelerated animations</li>
            <li>• RequestAnimationFrame updates</li>
            <li>• Memory efficient</li>
            <li>• 60fps smooth interactions</li>
            <li>• Battery-aware optimizations</li>
            <li>• Performance monitoring</li>
          </ul>
        </Card>
      </div>

      {/* Progress bars with different configurations */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Variants Showcase</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Compact Variant (Good for mobile)</h4>
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              variant="compact"
              touchMode={true}
              showTimeDisplay={false}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Minimal Variant (Space efficient)</h4>
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              variant="minimal"
              showTimeDisplay={false}
              showBufferIndicator={false}
              showSegmentMarkers={false}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Full Featured (Desktop)</h4>
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              isLoading={isLoading}
              bufferedRanges={bufferedRanges}
              segments={demoSegments}
              onSeek={handleSeek}
              variant="default"
              touchMode={false}
            />
          </div>
        </div>
      </Card>

      {/* Device information */}
      <Card className="p-4">
        <h4 className="font-medium mb-2">📱 Device Information</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Device Type: {mobileDetector.getDeviceInfo().type}</p>
          <p>• Touch Support: {mobileDetector.hasTouchSupport() ? "Yes" : "No"}</p>
          <p>• Screen Size: {mobileDetector.getDeviceInfo().screenSize.width}x{mobileDetector.getDeviceInfo().screenSize.height}</p>
          <p>• Touch Mode: {touchMode ? "Enabled" : "Disabled"}</p>
          <p>• Pixel Ratio: {mobileDetector.getDeviceInfo().pixelRatio}</p>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">🎮 How to Test</h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p>• <strong>Mouse:</strong> Click and drag the progress bar to seek</p>
          <p>• <strong>Touch:</strong> Tap and drag on mobile devices</p>
          <p>• <strong>Keyboard:</strong> Tab to the progress bar and use arrow keys</p>
          <p>• <strong>Markers:</strong> Click segment markers to jump to sections</p>
          <p>• <strong>Response Time:</strong> Check console for performance warnings</p>
          <p>• <strong>Haptics:</strong> Feel feedback on mobile devices</p>
        </div>
      </Card>
    </div>
  );
};

export default ProgressBarDemo;
