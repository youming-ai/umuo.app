"use client";

import React, { useState, useEffect } from "react";
import { ProgressIndicator, ProgressIndicatorProps } from "./ProgressIndicator";
import { ProgressUpdate } from "@/types/progress";

/**
 * Example component demonstrating how to use the ProgressIndicator
 * with mock data and different variants
 */

export function ProgressIndicatorExample() {
  const [mockProgress, setMockProgress] = useState<ProgressUpdate>(createInitialMockProgress());
  const [variant, setVariant] = useState<ProgressIndicatorProps["variant"]>("default");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && mockProgress.status !== "completed" && mockProgress.status !== "failed") {
      interval = setInterval(() => {
        setMockProgress(prev => simulateProgressUpdate(prev));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mockProgress.status]);

  const handleStart = () => {
    setIsRunning(true);
    if (mockProgress.status === "completed" || mockProgress.status === "failed") {
      setMockProgress(createInitialMockProgress());
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setMockProgress(createInitialMockProgress());
  };

  const handleStageClick = (stage: string) => {
    console.log(`Stage clicked: ${stage}`);
  };

  const handleRetry = () => {
    setMockProgress(createInitialMockProgress());
    setIsRunning(true);
  };

  const handleCancel = () => {
    setIsRunning(false);
    setMockProgress(prev => ({
      ...prev,
      status: "failed",
      error: {
        type: "cancelled",
        message: "Processing was cancelled by user",
        suggestedAction: "Try again"
      }
    }));
  };

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Progress Indicator Examples</h1>
        <p className="text-muted-foreground">
          Interactive examples of the ProgressIndicator component with different variants and states
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Controls</h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Start Demo
          </button>
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="text-sm font-medium">Variant:</label>
          {(["default", "compact", "detailed", "minimal"] as const).map(v => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={cn(
                "px-3 py-1 text-sm rounded-md border transition-colors",
                variant === v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-4">
        <h3 className="font-medium">Progress Indicator ({variant})</h3>

        <ProgressIndicator
          progress={mockProgress}
          variant={variant}
          showETA={variant !== "minimal"}
          showDetails={variant !== "minimal"}
          allowInteraction={variant !== "minimal"}
          mobileOptimized={true}
          onStageClick={handleStageClick}
          onRetry={handleRetry}
          onCancel={handleCancel}
          className="w-full"
        />
      </div>

      {/* Mock Progress Data Display */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="font-medium mb-3">Mock Progress Data</h3>
        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
          {JSON.stringify(mockProgress, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Helper functions for creating and updating mock progress data
function createInitialMockProgress(): ProgressUpdate {
  return {
    jobId: "demo-job-" + Date.now(),
    fileId: 1,
    status: "uploading",
    overallProgress: 0,
    currentStage: "upload",
    message: "Starting upload...",
    timestamp: Date.now(),
    stages: {
      upload: {
        progress: 0,
        speed: 0,
        eta: 30000,
        bytesTransferred: 0,
        totalBytes: 50 * 1024 * 1024, // 50MB
      },
      transcription: {
        progress: 0,
        currentChunk: 0,
        totalChunks: 10,
        eta: 180000,
      },
      "post-processing": {
        progress: 0,
        segmentsProcessed: 0,
        totalSegments: 100,
      },
    },
    mobileOptimizations: {
      connectionType: "wifi",
      batteryLevel: 85,
      isLowPowerMode: false,
    },
  };
}

function simulateProgressUpdate(current: ProgressUpdate): ProgressUpdate {
  const updated = { ...current };
  updated.timestamp = Date.now();

  // Update based on current stage
  if (updated.status === "uploading") {
    const uploadProgress = Math.min(100, updated.overallProgress + Math.random() * 15);
    updated.overallProgress = uploadProgress;
    updated.stages!.upload!.progress = uploadProgress / 0.1; // Upload is 10% of total
    updated.stages!.upload!.speed = 1024 * 1024 * (1 + Math.random() * 2); // 1-3 MB/s
    updated.stages!.upload!.bytesTransferred = Math.floor(
      (updated.stages!.upload!.progress / 100) * updated.stages!.upload!.totalBytes!
    );

    if (uploadProgress >= 10) {
      updated.status = "processing";
      updated.currentStage = "transcription";
      updated.message = "Transcribing audio...";
    } else {
      updated.message = `Uploading... ${Math.round(updated.overallProgress)}%`;
    }
  } else if (updated.status === "processing") {
    if (updated.currentStage === "transcription") {
      const transcriptionProgress = Math.min(100, (updated.overallProgress - 10) / 0.75);
      updated.stages!.transcription!.progress = transcriptionProgress;

      if (transcriptionProgress < 100) {
        updated.overallProgress = 10 + (transcriptionProgress * 0.75);
        const chunk = Math.floor((transcriptionProgress / 100) * updated.stages!.transcription!.totalChunks!);
        updated.stages!.transcription!.currentChunk = chunk;
        updated.message = `Transcribing chunk ${chunk + 1} of ${updated.stages!.transcription!.totalChunks}...`;
      } else {
        updated.currentStage = "post-processing";
        updated.message = "Post-processing transcription...";
      }
    } else if (updated.currentStage === "post-processing") {
      const postProgress = Math.min(100, (updated.overallProgress - 85) / 0.15 * 100);
      updated.stages!["post-processing"]!.progress = postProgress;

      if (postProgress < 100) {
        updated.overallProgress = 85 + (postProgress * 0.15);
        updated.stages!["post-processing"]!.segmentsProcessed = Math.floor(
          (postProgress / 100) * updated.stages!["post-processing"]!.totalSegments!
        );
        updated.message = "Enhancing transcription with translations and annotations...";
      } else {
        updated.status = "completed";
        updated.overallProgress = 100;
        updated.message = "Processing completed successfully!";
      }
    }
  }

  // Calculate ETAs
  Object.values(updated.stages!).forEach(stage => {
    if (stage.progress > 0 && stage.progress < 100) {
      const estimatedRemaining = ((100 - stage.progress) / stage.progress) * 30000; // Rough estimate
      stage.eta = Math.round(estimatedRemaining);
    }
  });

  return updated;
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
