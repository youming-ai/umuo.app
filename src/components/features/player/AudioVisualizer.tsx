"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils/utils";

interface AudioVisualizerProps {
  /** Audio element reference */
  audioRef: React.RefObject<HTMLAudioElement>;
  /** Canvas element reference */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Audio analyser reference */
  analyserRef: React.RefObject<AnalyserNode | null>;
  /** Whether the visualizer should be active */
  isActive: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Visualizer style */
  visualizerType?: "bars" | "wave" | "circular";
  /** Color scheme */
  colorScheme?: "primary" | "accent" | "gradient";
  /** Number of frequency bars */
  barCount?: number;
  /** Animation smoothness */
  smoothing?: number;
}

/**
 * AudioVisualizer - Real-time audio visualization with canvas rendering
 * Optimized for performance with <200ms response time
 */
export const AudioVisualizer = React.memo<AudioVisualizerProps>(
  ({
    audioRef,
    canvasRef,
    analyserRef,
    isActive,
    className = "",
    visualizerType = "bars",
    colorScheme = "primary",
    barCount = 32,
    smoothing = 0.8,
  }) => {
    const animationRef = useRef<number | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const previousFrameRef = useRef<number>(0);

    // Performance optimization: use requestAnimationFrame with throttling
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    // Color schemes
    const getColorScheme = useCallback((context: CanvasRenderingContext2D) => {
      const schemes = {
        primary: {
          primary: "#22c55e",
          secondary: "rgba(34, 197, 94, 0.5)",
          background: "rgba(34, 197, 94, 0.1)",
        },
        accent: {
          primary: "#3b82f6",
          secondary: "rgba(59, 130, 246, 0.5)",
          background: "rgba(59, 130, 246, 0.1)",
        },
        gradient: {
          primary: "#8b5cf6",
          secondary: "#ec4899",
          background: "rgba(139, 92, 246, 0.1)",
        },
      };
      return schemes[colorScheme] || schemes.primary;
    }, [colorScheme]);

    // Initialize visualizer
    const initializeVisualizer = useCallback(() => {
      if (!audioRef.current || !canvasRef.current || isInitialized) {
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas size
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      setIsInitialized(true);

      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }, [audioRef, canvasRef, isInitialized]);

    // Draw bars visualization
    const drawBars = useCallback(
      (context: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) => {
        const colors = getColorScheme(context);
        const barWidth = width / barCount;
        const barGap = barWidth * 0.2;

        context.clearRect(0, 0, width, height);

        dataArray.forEach((value, index) => {
          const barHeight = (value / 255) * height * 0.8;
          const x = index * barWidth + barGap / 2;
          const y = height - barHeight;

          // Create gradient for each bar
          const gradient = context.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(0, colors.primary);
          gradient.addColorStop(1, colors.secondary);

          context.fillStyle = gradient;
          context.fillRect(x, y, barWidth - barGap, barHeight);

          // Add subtle glow effect
          if (value > 200) {
            context.shadowBlur = 10;
            context.shadowColor = colors.primary;
            context.fillRect(x, y, barWidth - barGap, 2);
            context.shadowBlur = 0;
          }
        });
      },
      [barCount, getColorScheme],
    );

    // Draw wave visualization
    const drawWave = useCallback(
      (context: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) => {
        const colors = getColorScheme(context);
        const sliceWidth = width / dataArray.length;

        context.clearRect(0, 0, width, height);

        context.lineWidth = 2;
        context.strokeStyle = colors.primary;
        context.beginPath();

        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i] / 255;
          const y = value * height;

          if (i === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }

          x += sliceWidth;
        }

        context.stroke();

        // Add filled area under wave
        context.lineTo(width, height);
        context.lineTo(0, height);
        context.closePath();
        context.fillStyle = colors.background;
        context.fill();
      },
      [getColorScheme],
    );

    // Draw circular visualization
    const drawCircular = useCallback(
      (context: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) => {
        const colors = getColorScheme(context);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;

        context.clearRect(0, 0, width, height);

        const angleStep = (Math.PI * 2) / dataArray.length;

        dataArray.forEach((value, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const barHeight = (value / 255) * radius;
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);

          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.strokeStyle = colors.primary;
          context.lineWidth = 2;
          context.stroke();

          // Add circular glow
          if (value > 200) {
            context.beginPath();
            context.arc(x2, y2, 3, 0, Math.PI * 2);
            context.fillStyle = colors.secondary;
            context.fill();
          }
        });

        // Center circle
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.strokeStyle = colors.secondary;
        context.lineWidth = 1;
        context.stroke();
      },
      [getColorScheme],
    );

    // Animation loop with performance optimization
    const animate = useCallback(
      (timestamp: number) => {
        if (!canvasRef.current || !analyserRef.current) return;

        // Throttle to target FPS
        if (timestamp - previousFrameRef.current < frameInterval) {
          animationRef.current = requestAnimationFrame(animate);
          return;
        }

        previousFrameRef.current = timestamp;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const analyser = analyserRef.current;

        if (!context || !analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Downsample for performance
        const step = Math.floor(dataArray.length / barCount);
        const sampledData = new Uint8Array(barCount);

        for (let i = 0; i < barCount; i++) {
          sampledData[i] = dataArray[i * step];
        }

        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Draw based on visualization type
        switch (visualizerType) {
          case "wave":
            analyser.getByteTimeDomainData(dataArray);
            drawWave(context, sampledData, width, height);
            break;
          case "circular":
            drawCircular(context, sampledData, width, height);
            break;
          default:
            drawBars(context, sampledData, width, height);
        }

        if (isActive) {
          animationRef.current = requestAnimationFrame(animate);
        }
      },
      [
        canvasRef,
        analyserRef,
        isActive,
        frameInterval,
        previousFrameRef,
        barCount,
        visualizerType,
        drawBars,
        drawWave,
        drawCircular,
      ],
    );

    // Start/stop animation based on active state
    useEffect(() => {
      if (isActive && isInitialized) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isActive, isInitialized, animate]);

    // Initialize on mount
    useEffect(() => {
      initializeVisualizer();
    }, [initializeVisualizer]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          "transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-30",
          className,
        )}
        aria-hidden="true"
        style={{
          imageRendering: "crisp-edges",
        }}
      />
    );
  },
);

AudioVisualizer.displayName = "AudioVisualizer";

export default AudioVisualizer;
