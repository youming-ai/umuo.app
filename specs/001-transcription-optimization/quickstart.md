# Quickstart Guide: Transcription Process Optimization & UI Improvements

**Purpose**: Get started with enhanced transcription features including optimized processing, real-time progress tracking, and mobile touch improvements
**Target Audience**: Developers implementing the optimization features
**Prerequisites**: Existing umuo.app codebase, Node.js 18+, pnpm, GROQ_API_KEY

## Overview

This guide walks through implementing the transcription optimization features that will:

- **Reduce transcription time by 40%** through connection pooling and chunked processing
- **Provide real-time progress tracking** with 2-second updates
- **Improve mobile touch experience** with enhanced controls and gestures
- **Add comprehensive error handling** with automated recovery
- **Enable concurrent processing** for multiple files

## Prerequisites

### Environment Setup

```bash
# Ensure you're on the correct branch
git checkout 001-transcription-optimization

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local to add your GROQ_API_KEY
```

### Required Environment Variables

```env
# Enhanced Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=25000
GROQ_MAX_RETRIES=3
GROQ_MAX_CONCURRENCY=2

# Optimization Configuration
GROQ_CHUNK_SIZE_THRESHOLD_MB=15
GROQ_MAX_CHUNK_DURATION_SEC=300
GROQ_MIN_CHUNK_DURATION_SEC=30
GROQ_CACHE_SIZE_MB=100

# Performance Monitoring
GROQ_PERFORMANCE_MONITORING=true
GROQ_METRICS_RETENTION_HOURS=24
```

## Implementation Steps

### Step 1: Enhanced Groq SDK Integration

#### Create Connection Pool and Retry Strategy

```bash
# Create the optimized Groq integration directory
mkdir -p src/lib/groq
mkdir -p src/lib/audio
mkdir -p src/lib/performance
mkdir -p src/components/features/player
mkdir -p src/components/features/progress-tracking
mkdir -p src/components/features/file-upload
mkdir -p src/hooks
```

**File: `src/lib/groq/groq-client-factory.ts`**

```typescript
import Groq from "groq-sdk";

interface GroqClientConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

class GroqClientFactory {
  private static instance: GroqClientFactory;
  private clients: Map<string, Groq> = new Map();
  private connectionPool: Groq[] = [];
  private maxPoolSize = 5;

  static getInstance(): GroqClientFactory {
    if (!this.instance) {
      this.instance = new GroqClientFactory();
    }
    return this.instance;
  }

  getClient(config: GroqClientConfig): Groq {
    const key = this.generateKey(config);
    
    if (!this.clients.has(key)) {
      const client = new Groq({
        apiKey: config.apiKey,
        baseURL: config.baseURL || process.env.GROQ_BASE_URL,
        timeout: config.timeout || 25000,
        maxRetries: config.maxRetries || 2,
      });
      
      this.clients.set(key, client);
      this.addToPool(client);
    }
    
    return this.clients.get(key)!;
  }

  private addToPool(client: Groq): void {
    if (this.connectionPool.length < this.maxPoolSize) {
      this.connectionPool.push(client);
    }
  }

  private generateKey(config: GroqClientConfig): string {
    return `${config.apiKey.slice(0, 8)}_${config.baseURL || 'default'}`;
  }
}

export { GroqClientFactory };
```

**File: `src/lib/groq/groq-retry-strategy.ts`**

```typescript
export interface GroqRetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export const GROQ_RETRY_OPTIONS: GroqRetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT', 
    'ENOTFOUND',
    'rate_limit_exceeded',
    'insufficient_quota',
    'overloaded_error'
  ],
  onRetry: (attempt, error) => {
    console.warn(`Groq API retry attempt ${attempt}:`, error.message);
  }
};

export async function transcribeWithRetry<T>(
  transcriptionFn: () => Promise<T>,
  options: Partial<GroqRetryOptions> = {}
): Promise<T> {
  const config = { ...GROQ_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await transcriptionFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === config.maxAttempts || !isRetryableError(lastError, config)) {
        throw lastError;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      config.onRetry?.(attempt, lastError);
      await sleep(delay + Math.random() * 1000);
    }
  }

  throw lastError!;
}

function isRetryableError(error: Error, config: GroqRetryOptions): boolean {
  const message = error.message.toLowerCase();
  return config.retryableErrors.some(retryableError => 
    message.includes(retryableError.toLowerCase())
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Step 2: Real-Time Progress Tracking

#### Enhanced Progress Hook

**File: `src/hooks/useProgressTracking.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transcriptionKeys } from '@/lib/query-keys';

interface ProgressData {
  jobId: string;
  overallProgress: number;
  currentStage: string;
  message: string;
  stages: {
    upload: { progress: number; speed: number; eta?: number };
    transcription: { progress: number; currentChunk: number; totalChunks: number; eta?: number };
    'post-processing': { progress: number; segmentsProcessed: number; totalSegments: number };
  };
  error?: {
    type: string;
    message: string;
    suggestedAction: string;
  };
}

export function useProgressTracking(jobId: string, enableSSE = true) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [connectionType, setConnectionType] = useState<'sse' | 'polling' | 'periodic'>('sse');

  // Server-Sent Events implementation
  useEffect(() => {
    if (!enableSSE || !jobId) return;

    const eventSource = new EventSource(`/api/progress/${jobId}/stream`);
    setConnectionType('sse');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgressData(data);
      } catch (error) {
        console.error('Error parsing progress data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setConnectionType('polling');
      // Fallback to polling implemented below
    };

    return () => eventSource.close();
  }, [jobId, enableSSE]);

  // Fallback polling with TanStack Query
  const { data: pollingData, error: pollingError } = useQuery({
    queryKey: transcriptionKeys.progress(jobId),
    queryFn: async () => {
      const response = await fetch(`/api/progress/${jobId}?detailed=true`);
      if (!response.ok) throw new Error('Progress fetch failed');
      return response.json() as Promise<ProgressData>;
    },
    refetchInterval: (data) => {
      if (!data) return 2000;
      if (data.currentStage === 'transcription') return 2000;
      if (data.currentStage === 'completed' || data.currentStage === 'failed') return false;
      return 5000;
    },
    refetchIntervalInBackground: true,
    staleTime: 1500,
    enabled: connectionType === 'polling' || !enableSSE,
  });

  // Use SSE data when available, fallback to polling
  const effectiveProgress = connectionType === 'sse' ? progressData : pollingData;

  return {
    progress: effectiveProgress,
    connectionType,
    error: pollingError,
    isConnected: effectiveProgress !== null,
  };
}
```

#### Progress Tracking Component

**File: `src/components/features/progress-tracking/ProgressIndicator.tsx`**

```typescript
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ProgressIndicatorProps {
  progress: any;
  className?: string;
  compact?: boolean;
}

export function ProgressIndicator({ progress, className, compact = false }: ProgressIndicatorProps) {
  if (!progress) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative w-16 h-16">
          <Progress value={progress.overallProgress} className="h-2" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium">{progress.overallProgress}%</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{progress.message}</span>
          <span className="text-xs text-muted-foreground">
            {progress.stages?.transcription && 
              `Chunk ${progress.stages.transcription.currentChunk}/${progress.stages.transcription.totalChunks}`
            }
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{progress.message}</span>
          <span className="text-sm text-muted-foreground">{progress.overallProgress}%</span>
        </div>
        <Progress value={progress.overallProgress} className="h-3" />
      </div>

      {/* Stage breakdown */}
      {progress.stages && (
        <div className="space-y-3">
          {Object.entries(progress.stages).map(([stage, data]: [string, any]) => (
            <div key={stage} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground capitalize">
                  {stage.replace('-', ' ')}
                </span>
                <span className="text-xs">{data.progress}%</span>
              </div>
              <Progress 
                value={data.progress} 
                className="h-2" 
                variant={data.progress === 100 ? "default" : "secondary"}
              />
              {data.eta && (
                <p className="text-xs text-muted-foreground">
                  ETA: {Math.round(data.eta)}s
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {progress.error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{progress.error.message}</p>
              <p className="text-sm">{progress.error.suggestedAction}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### Step 3: Enhanced API Routes

#### Optimized Transcription Route

**File: `src/app/api/transcribe/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GroqClientFactory } from '@/lib/groq/groq-client-factory';
import { transcribeWithRetry } from '@/lib/groq/groq-retry-strategy';
import { AudioChunkingStrategy } from '@/lib/audio/chunking-strategy';
import { TimeoutManager } from '@/lib/groq/timeout-manager';
import { z } from 'zod';

const transcriptionRequestSchema = z.object({
  audio: z.instanceof(File).refine(file => file.size > 0, 'Audio file is required'),
  language: z.string().default('auto'),
  priority: z.number().min(0).max(10).default(0),
  enable_chunking: z.boolean().default(false),
  chunk_size_mb: z.number().min(1).max(50).default(15),
  progress_tracking: z.boolean().default(true),
  update_interval_ms: z.number().min(1000).max(10000).default(2000),
  device_info: z.object({
    device_type: z.enum(['desktop', 'mobile', 'tablet']),
    network_type: z.enum(['wifi', 'cellular', 'unknown']).optional(),
    battery_level: z.number().min(0).max(1).optional(),
    is_low_power_mode: z.boolean().default(false),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const formData = await request.formData();
    const validatedData = transcriptionRequestSchema.parse({
      audio: formData.get('audio'),
      language: formData.get('language') || 'auto',
      priority: parseInt(formData.get('priority') as string) || 0,
      enable_chunking: formData.get('enable_chunking') === 'true',
      chunk_size_mb: parseInt(formData.get('chunk_size_mb') as string) || 15,
      progress_tracking: formData.get('progress_tracking') !== 'false',
      update_interval_ms: parseInt(formData.get('update_interval_ms') as string) || 2000,
      device_info: formData.get('device_info') ? JSON.parse(formData.get('device_info') as string) : undefined,
    });

    const { audio, language, priority, enable_chunking, chunk_size_mb, device_info } = validatedData;
    
    // Check if chunking is needed
    const shouldChunk = enable_chunking || audio.size > (chunk_size_mb * 1024 * 1024);
    const timeout = TimeoutManager.calculateOptimalTimeout(audio.size, shouldChunk);
    
    // Create transcription job (implementation would go here)
    const jobId = `job_${requestId}`;
    
    // Start processing in background
    if (shouldChunk) {
      // Chunked transcription implementation
      processChunkedTranscription(jobId, audio, language, timeout);
    } else {
      // Direct transcription implementation
      processDirectTranscription(jobId, audio, language, timeout);
    }
    
    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        file_id: 0, // Would be set after file save
        status: 'queued',
        priority,
        created_at: new Date().toISOString(),
        is_chunked: shouldChunk,
        total_chunks: shouldChunk ? Math.ceil(audio.size / (chunk_size_mb * 1024 * 1024)) : 1,
        current_stage: 'upload',
        overall_progress: 0,
        language,
        model: 'whisper-large-v3-turbo',
      },
      message: "Transcription job created successfully"
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TRANSCRIPTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          suggested_action: 'Please check your audio file and try again'
        }
      }
    }, { status: 500 });
  }
}

async function processDirectTranscription(
  jobId: string,
  audio: File,
  language: string,
  timeout: number
) {
  // Implementation would go here
  // This would integrate with the existing file and transcription management
}

async function processChunkedTranscription(
  jobId: string,
  audio: File,
  language: string,
  timeout: number
) {
  // Implementation would go here
  // This would handle chunking, concurrent processing, and result merging
}
```

#### Progress Streaming Route

**File: `src/app/api/progress/[jobId]/stream/route.ts`**

```typescript
import { NextRequest } from 'next/server';
import { getServerProgress } from '@/lib/server-progress';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const encoder = new TextEncoder();
  const jobId = params.jobId;
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial progress
      try {
        const initialProgress = await getServerProgress(jobId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`));
        
        // Set up progress monitoring
        const interval = setInterval(async () => {
          try {
            const progress = await getServerProgress(jobId);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            
            if (progress?.status === 'completed' || progress?.status === 'failed') {
              clearInterval(interval);
              controller.close();
            }
          } catch (error) {
            console.error('Progress tracking error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: { type: 'connection_error', message: 'Progress tracking temporarily unavailable' }
            })}\n\n`));
          }
        }, 2000);
        
        // Cleanup on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
        
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: { type: 'initialization_error', message: 'Failed to initialize progress tracking' }
        })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
```

### Step 4: Mobile Touch Optimizations

#### Enhanced Audio Player with Touch Gestures

**File: `src/components/features/player/TouchOptimizedPlayer.tsx`**

```typescript
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils/utils';

interface TouchOptimizedPlayerProps {
  audioPlayerState: any;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function TouchOptimizedPlayer({
  audioPlayerState,
  onSeek,
  onTogglePlay,
  onPlaybackRateChange,
  volume,
  onVolumeChange
}: TouchOptimizedPlayerProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  // Touch gesture handling for progress bar
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !progressRef.current) return;
    
    const touch = e.touches[0];
    const rect = progressRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = (percentage / 100) * audioPlayerState.duration;
    
    onSeek(newTime);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Double tap detection for play/pause
  const handleProgressTouch = (e: React.TouchEvent) => {
    const currentTime = Date.now();
    const tapLength = currentTime - lastTapRef.current;
    
    if (tapLength < 300 && tapLength > 0) {
      onTogglePlay();
    }
    lastTapRef.current = currentTime;
  };

  const progressWidth = Math.min(100, Math.max(0, (audioPlayerState.currentTime / audioPlayerState.duration) * 100));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent safe-area-inset-bottom">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="player-card flex flex-col gap-4">
          {/* Enhanced progress bar with touch support */}
          <div className="flex items-center gap-3 px-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[45px]">
              {formatTime(audioPlayerState.currentTime)}
            </span>
            <div 
              ref={progressRef}
              className="group relative h-3 flex-1 touch-target-optimal"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleProgressTouch}
            >
              <div className="h-full rounded-full bg-muted">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-75"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={audioPlayerState.duration || 100}
                value={audioPlayerState.currentTime}
                onChange={(event) => onSeek(parseFloat(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                style={{ touchAction: 'none' }}
              />
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 -ml-3 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-lg transition-transform",
                  isDragging && "scale-125"
                )}
                style={{ left: `${progressWidth}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground min-w-[45px] text-right">
              {formatTime(audioPlayerState.duration || 0)}
            </span>
          </div>

          {/* Touch-optimized control buttons */}
          <div className="flex items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-1">
              <VolumeControl 
                volume={volume}
                onVolumeChange={onVolumeChange}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                size="mobile"
                variant="ghost"
                onClick={() => onSeek(audioPlayerState.currentTime - 10)}
                className="h-14 w-14"
              >
                <span className="material-symbols-outlined text-2xl">replay_10</span>
              </Button>
              
              <Button
                size="mobile"
                onClick={onTogglePlay}
                className="h-16 w-16 bg-primary text-white shadow-md"
              >
                <span className="material-symbols-outlined text-3xl">
                  {audioPlayerState.isPlaying ? "pause" : "play_arrow"}
                </span>
              </Button>
              
              <Button
                size="mobile"
                variant="ghost"
                onClick={() => onSeek(audioPlayerState.currentTime + 10)}
                className="h-14 w-14"
              >
                <span className="material-symbols-outlined text-2xl">forward_10</span>
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <SpeedControl
                currentRate={audioPlayerState.playbackRate || 1}
                onRateChange={onPlaybackRateChange}
                showMenu={showSpeedMenu}
                setShowMenu={setShowSpeedMenu}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Supporting components would go here (VolumeControl, SpeedControl)
```

### Step 5: Testing and Validation

#### Performance Testing

```bash
# Test transcription speed improvements
pnpm test:transcription-performance

# Test progress tracking functionality
pnpm test:progress-tracking

# Test mobile touch interactions
pnpm test:mobile-interactions

# Run comprehensive integration tests
pnpm test:integration
```

#### Validation Checklist

- [ ] Transcription time reduced by 40% for 5-minute files
- [ ] Progress updates every 2 seconds during processing
- [ ] Mobile touch targets are 44px minimum (48px optimal)
- [ ] Server-Sent Events work and fallback to polling
- [ ] Error messages provide clear recovery guidance
- [ ] Concurrent processing works for multiple files
- [ ] Audio chunking handles files >15MB
- [ ] Mobile gestures work on actual devices

## Monitoring and Analytics

### Performance Metrics Dashboard

Access the performance metrics at `/api/performance/metrics` to monitor:

- **Transcription Performance**: Processing time, success rate, cost estimates
- **Progress Tracking**: Connection health, update frequency, error rates  
- **Mobile Analytics**: Touch response times, task completion rates, device distribution
- **UI Performance**: Core Web Vitals, interaction delays, layout stability

### Error Monitoring

All errors are automatically classified and logged with:

- Error type and recovery suggestions
- Device and network context
- Performance impact assessment
- User interaction patterns

## Troubleshooting

### Common Issues

1. **SSE Connection Fails**
   - Check firewall settings
   - Verify CORS headers
   - Falls back to polling automatically

2. **Mobile Touch Not Responding**
   - Verify touch targets are 44px minimum
   - Check CSS `touch-action` properties
   - Test on actual mobile devices

3. **Chunked Processing Slow**
   - Adjust chunk size thresholds
   - Monitor API rate limits
   - Check network conditions

4. **Progress Updates Not Showing**
   - Verify WebSocket/SSE connection
   - Check query invalidation
   - Monitor browser console for errors

### Performance Optimization

1. **Enable Performance Monitoring**
   ```env
   GROQ_PERFORMANCE_MONITORING=true
   ```

2. **Adjust Chunk Size for Network**
   ```env
   GROQ_CHUNK_SIZE_THRESHOLD_MB=10  # For slower networks
   ```

3. **Optimize Update Frequency**
   ```env
   # Reduce for mobile networks
   UPDATE_INTERVAL_MS=3000
   ```

## Deployment

### Environment Configuration

```bash
# Deploy to Vercel
pnpm deploy:prod

# Verify all environment variables are set
vercel env ls
```

### Post-Deployment Validation

1. **Health Check**: Verify all API endpoints respond correctly
2. **Performance Test**: Run load testing with concurrent transcriptions
3. **Mobile Testing**: Test touch interactions on various devices
4. **Error Recovery**: Test error handling and recovery mechanisms

## Support

For implementation support:

1. **Documentation**: Check the generated API contracts in `/contracts/transcription-api.yaml`
2. **Code Examples**: Review the implementation in the existing codebase
3. **Performance Monitoring**: Use the metrics dashboard to identify issues
4. **Error Logs**: Check browser console and server logs for detailed error information

This quickstart guide provides the foundation for implementing all transcription optimization features while maintaining compatibility with the existing umuo.app architecture.