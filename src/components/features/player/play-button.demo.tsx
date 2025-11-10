"use client";

import React, { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { PlayButton, type PlayButtonProps, type PlayButtonRef } from "./play-button";
import { cn } from "@/lib/utils/utils";

// Demo component types
interface DemoSection {
  title: string;
  description: string;
  component: React.ReactNode;
}

// Basic PlayButton Demo
const BasicPlayButtonDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async (newState: boolean) => {
    // Simulate async operation
    if (newState) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsPlaying(newState);
    setIsLoading(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <PlayButton
        isPlaying={isPlaying}
        isLoading={isLoading}
        onToggle={handleToggle}
        label="Basic Play Button Demo"
        ariaLabel="Toggle audio playback"
        analyticsData={{ source: "basic-demo" }}
      />

      <div className="text-sm text-center space-y-1">
        <p>State: <span className="font-mono">{isPlaying ? "Playing" : "Paused"}</span></p>
        {isLoading && <p className="text-yellow-600">Loading...</p>}
      </div>
    </div>
  );
};

// Size Variants Demo
const SizeVariantsDemo: React.FC = () => {
  const [playingStates, setPlayingStates] = useState([false, false, false, false]);

  const handleToggle = useCallback((index: number) => {
    setPlayingStates(prev => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      return newStates;
    });
  }, []);

  const sizes = ["compact", "normal", "large", "extra-large"] as const;

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Size Variants</h4>
      <div className="grid grid-cols-2 gap-8">
        {sizes.map((size, index) => (
          <div key={size} className="flex flex-col items-center space-y-2">
            <PlayButton
              isPlaying={playingStates[index]}
              onToggle={() => handleToggle(index)}
              size={size}
              label={`${size} play button`}
              analyticsData={{ size, source: "size-variants-demo" }}
            />
            <span className="text-sm font-mono capitalize">{size}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Variant Styles Demo
const VariantStylesDemo: React.FC = () => {
  const [playingStates, setPlayingStates] = useState([false, false, false, false]);

  const handleToggle = useCallback((index: number) => {
    setPlayingStates(prev => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      return newStates;
    });
  }, []);

  const variants = ["minimal", "standard", "enhanced", "icon-only"] as const;

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Style Variants</h4>
      <div className="grid grid-cols-2 gap-8">
        {variants.map((variant, index) => (
          <div key={variant} className="flex flex-col items-center space-y-2">
            <PlayButton
              isPlaying={playingStates[index]}
              onToggle={() => handleToggle(index)}
              variant={variant}
              size="large"
              label={`${variant} style play button`}
              analyticsData={{ variant, source: "variant-styles-demo" }}
            />
            <span className="text-sm font-mono capitalize">{variant}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// State Variations Demo
const StateVariationsDemo: React.FC = () => {
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">State Variations</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={false}
            label="Paused state"
            analyticsData={{ state: "paused", source: "state-variations-demo" }}
          />
          <span className="text-sm">Paused</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={true}
            label="Playing state"
            analyticsData={{ state: "playing", source: "state-variations-demo" }}
          />
          <span className="text-sm">Playing</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={false}
            isLoading={true}
            label="Loading state"
            analyticsData={{ state: "loading", source: "state-variations-demo" }}
          />
          <span className="text-sm">Loading</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={false}
            hasError={true}
            label="Error state"
            analyticsData={{ state: "error", source: "state-variations-demo" }}
          />
          <span className="text-sm">Error</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={false}
            disabled={true}
            label="Disabled state"
            analyticsData={{ state: "disabled", source: "state-variations-demo" }}
          />
          <span className="text-sm">Disabled</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <PlayButton
            isPlaying={true}
            isLoading={true}
            label="Loading while playing"
            analyticsData={{ state: "loading-playing", source: "state-variations-demo" }}
          />
          <span className="text-sm">Loading + Playing</span>
        </div>
      </div>
    </div>
  );
};

// Advanced Features Demo
const AdvancedFeaturesDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const buttonRef = useRef<PlayButtonRef>(null);

  const handleToggle = useCallback(async () => {
    const startTime = performance.now();

    setIsPlaying(!isPlaying);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    const endTime = performance.now();
    setResponseTime(endTime - startTime);
  }, [isPlaying]);

  const measurePerformance = useCallback(() => {
    if (buttonRef.current) {
      const measuredTime = buttonRef.current.measureResponseTime();
      console.log(`Measured response time: ${measuredTime.toFixed(2)}ms`);
    }
  }, []);

  const programmaticControl = useCallback((action: "play" | "pause" | "toggle") => {
    if (buttonRef.current) {
      switch (action) {
        case "play":
          buttonRef.current.play();
          break;
        case "pause":
          buttonRef.current.pause();
          break;
        case "toggle":
          buttonRef.current.toggle();
          break;
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Advanced Features</h4>

      <div className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <PlayButton
            ref={buttonRef}
            isPlaying={isPlaying}
            onToggle={handleToggle}
            size="large"
            variant="enhanced"
            enableHaptics={true}
            enableVisualFeedback={true}
            keyboardShortcut="p"
            label="Advanced play button with haptics and visual feedback"
            analyticsData={{
              source: "advanced-features-demo",
              haptics: true,
              visualFeedback: true,
              keyboardShortcut: true
            }}
          />

          <div className="text-center space-y-2">
            <p className="text-sm">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded">P</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> to toggle
            </p>
            {responseTime && (
              <p className="text-sm font-mono">
                Last response time: {responseTime.toFixed(2)}ms
                {responseTime > 200 && <span className="text-red-500"> ⚠️</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => programmaticControl("toggle")}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Toggle
          </button>
          <button
            onClick={() => programmaticControl("play")}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Play
          </button>
          <button
            onClick={() => programmaticControl("pause")}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
          >
            Pause
          </button>
          <button
            onClick={measurePerformance}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Measure Performance
          </button>
        </div>
      </div>
    </div>
  );
};

// Mobile Touch Demo
const MobileTouchDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [touchCount, setTouchCount] = useState(0);

  const handleToggle = useCallback(() => {
    setIsPlaying(!isPlaying);
    setTouchCount(prev => prev + 1);
  }, [isPlaying]);

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Mobile Touch Optimizations</h4>

      <div className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Touch-optimized with haptic feedback and ripple effects
          </p>
          <p className="text-xs text-gray-500">
            Touch interactions: <span className="font-mono">{touchCount}</span>
          </p>
        </div>

        <PlayButton
          isPlaying={isPlaying}
          onToggle={handleToggle}
          size="extra-large"
          variant="enhanced"
          touchOptimized={true}
          enableHaptics={true}
          enableVisualFeedback={true}
          label="Mobile touch-optimized play button"
          analyticsData={{
            source: "mobile-touch-demo",
            touchOptimized: true,
            haptics: true
          }}
        />

        <div className="text-xs text-gray-500 text-center max-w-md">
          This button features:
          <ul className="mt-2 space-y-1">
            <li>• 44px minimum touch target (WCAG 2.1 compliant)</li>
            <li>• Haptic feedback on mobile devices</li>
            <li>• Ripple effects for visual feedback</li>
            <li>• No 300ms touch delay</li>
            <li>• GPU-accelerated animations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Performance Metrics Demo
const PerformanceMetricsDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [metrics, setMetrics] = useState<{
    responseTimes: number[];
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }>({
    responseTimes: [],
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: 0,
  });

  const handleToggle = useCallback(async () => {
    const startTime = performance.now();

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));

    const responseTime = performance.now() - startTime;

    setIsPlaying(!isPlaying);

    setMetrics(prev => {
      const newResponseTimes = [...prev.responseTimes, responseTime].slice(-20); // Keep last 20
      const averageResponseTime = newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length;
      const maxResponseTime = Math.max(...newResponseTimes);
      const minResponseTime = Math.min(...newResponseTimes);

      return {
        responseTimes: newResponseTimes,
        averageResponseTime,
        maxResponseTime,
        minResponseTime,
      };
    });
  }, [isPlaying]);

  const clearMetrics = useCallback(() => {
    setMetrics({
      responseTimes: [],
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
    });
  }, []);

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Performance Metrics</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center space-y-4">
          <PlayButton
            isPlaying={isPlaying}
            onToggle={handleToggle}
            size="large"
            variant="enhanced"
            label="Performance test button"
            analyticsData={{ source: "performance-metrics-demo" }}
          />

          <button
            onClick={clearMetrics}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Clear Metrics
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Average:</span>
              <div className={cn(
                "font-mono",
                metrics.averageResponseTime > 200 ? "text-red-500" : "text-green-500"
              )}>
                {metrics.averageResponseTime.toFixed(2)}ms
              </div>
            </div>

            <div>
              <span className="font-medium">Max:</span>
              <div className={cn(
                "font-mono",
                metrics.maxResponseTime > 200 ? "text-red-500" : "text-green-500"
              )}>
                {metrics.maxResponseTime.toFixed(2)}ms
              </div>
            </div>

            <div>
              <span className="font-medium">Min:</span>
              <div className="font-mono text-green-500">
                {metrics.minResponseTime.toFixed(2)}ms
              </div>
            </div>

            <div>
              <span className="font-medium">Samples:</span>
              <div className="font-mono">
                {metrics.responseTimes.length}
              </div>
            </div>
          </div>

          {metrics.responseTimes.length > 0 && (
            <div className="text-xs space-y-1">
              <div className="font-medium">Response Times (last 10):</div>
              <div className="font-mono space-y-1 max-h-20 overflow-y-auto">
                {metrics.responseTimes.slice(-10).reverse().map((time, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex justify-between",
                      time > 200 ? "text-red-500" : "text-green-500"
                    )}
                  >
                    <span>#{metrics.responseTimes.length - index}:</span>
                    <span>{time.toFixed(2)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Target: <span className="font-mono">&lt;200ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Demo Component
const PlayButtonDemo: React.FC = () => {
  const sections: DemoSection[] = [
    {
      title: "Basic Usage",
      description: "Simple play/pause toggle with loading state",
      component: <BasicPlayButtonDemo />,
    },
    {
      title: "Size Variants",
      description: "Different button sizes for various UI contexts",
      component: <SizeVariantsDemo />,
    },
    {
      title: "Style Variants",
      description: "Visual variants for different design needs",
      component: <VariantStylesDemo />,
    },
    {
      title: "State Variations",
      description: "All possible button states and their appearances",
      component: <StateVariationsDemo />,
    },
    {
      title: "Advanced Features",
      description: "Keyboard shortcuts, haptic feedback, and programmatic control",
      component: <AdvancedFeaturesDemo />,
    },
    {
      title: "Mobile Touch",
      description: "Touch-optimized interactions for mobile devices",
      component: <MobileTouchDemo />,
    },
    {
      title: "Performance Metrics",
      description: "Real-time performance monitoring and metrics",
      component: <PerformanceMetricsDemo />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">PlayButton Component Demo</h1>
        <p className="text-lg text-gray-600">
          Ultra-responsive play/pause button with &lt;200ms response time
        </p>
        <div className="flex justify-center flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">GPU Accelerated</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Touch Optimized</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Haptic Feedback</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">&lt;200ms Response</span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">WCAG 2.1 Compliant</span>
        </div>
      </div>

      {sections.map((section, index) => (
        <Card key={index} className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-gray-600">{section.description}</p>
            </div>
            <div className="min-h-[200px] flex items-center justify-center">
              {section.component}
            </div>
          </div>
        </Card>
      ))}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Basic Implementation</h3>
            <pre className="text-sm overflow-x-auto">
{`import { PlayButton } from '@/components/features/player/play-button';

const MyPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <PlayButton
      isPlaying={isPlaying}
      onToggle={setIsPlaying}
      size="normal"
      variant="standard"
    />
  );
};`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Advanced Implementation with Analytics</h3>
            <pre className="text-sm overflow-x-auto">
{`const AdvancedPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (newState: boolean) => {
    if (newState) {
      setIsLoading(true);
      await loadAudio();
      setIsLoading(false);
    }
    setIsPlaying(newState);
    trackEvent('audio_playback', { state: newState ? 'play' : 'pause' });
  };

  return (
    <PlayButton
      isPlaying={isPlaying}
      isLoading={isLoading}
      onToggle={handleToggle}
      size="large"
      variant="enhanced"
      enableHaptics={true}
      enableVisualFeedback={true}
      keyboardShortcut=" "
      analyticsData={{
        component: 'audio-player',
        userId: currentUserId,
        sessionId: currentSessionId
      }}
    />
  );
};`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PlayButtonDemo;
