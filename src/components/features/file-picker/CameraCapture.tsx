"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RotateCw,
  SwitchCamera,
  CameraOff,
  Square,
  Circle,
  Pause,
  Play,
  Download,
  X,
  Settings,
  Zap,
  Shield,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Timer,
  TimerOff,
  Flashlight,
  FlashlightOff,
  Image,
  Grid,
  GridOff,
  Focus,
  RefreshCw,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Hd,
  Sd,
  Camera as CameraIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useMobilePermissions } from "./hooks/useMobilePermissions";
import { useMediaRecorder } from "./hooks/useMediaRecorder";
import { useCameraSettings } from "./hooks/useCameraSettings";

interface CameraCaptureProps {
  onCapture?: (files: File[]) => void;
  onCancel?: () => void;
  mobileOptimized?: boolean;
  allowPhoto?: boolean;
  allowVideo?: boolean;
  allowAudio?: boolean;
  maxDuration?: number; // seconds
  quality?: "low" | "medium" | "high";
  showSettings?: boolean;
  enableFilters?: boolean;
  enableEffects?: boolean;
}

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput" | "audiooutput";
}

interface CameraSettings {
  videoQuality: "low" | "medium" | "high";
  audioQuality: "low" | "medium" | "high";
  enableFlashlight: boolean;
  enableGrid: boolean;
  enableTimer: number; // 0, 3, 5, 10 seconds
  enableFilters: boolean;
  currentFilter: string;
  frontCamera: boolean;
  enableStabilization: boolean;
  enableHDR: boolean;
  enableLowLight: boolean;
  maxFileSize: number;
  compressionLevel: number;
}

const VIDEO_QUALITIES = {
  low: { width: 640, height: 480, bitrate: 500000 },
  medium: { width: 1280, height: 720, bitrate: 2000000 },
  high: { width: 1920, height: 1080, bitrate: 5000000 }
};

const AUDIO_QUALITIES = {
  low: { sampleRate: 22050, bitrate: 32000 },
  medium: { sampleRate: 44100, bitrate: 64000 },
  high: { sampleRate: 48000, bitrate: 128000 }
};

const CAMERA_FILTERS = [
  { id: "none", name: "None", effect: "none" },
  { id: "grayscale", name: "Grayscale", effect: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", effect: "sepia(100%)" },
  { id: "blur", name: "Blur", effect: "blur(2px)" },
  { id: "brightness", name: "Bright", effect: "brightness(1.2)" },
  { id: "contrast", name: "Contrast", effect: "contrast(1.2)" },
  { id: "saturate", name: "Saturate", effect: "saturate(1.5)" }
];

const TIMER_OPTIONS = [
  { value: 0, label: "Off", icon: TimerOff },
  { value: 3, label: "3s", icon: Timer },
  { value: 5, label: "5s", icon: Timer },
  { value: 10, label: "10s", icon: Timer }
];

export default function CameraCapture({
  onCapture,
  onCancel,
  mobileOptimized = true,
  allowPhoto = true,
  allowVideo = true,
  allowAudio = true,
  maxDuration = 300, // 5 minutes default
  quality = "medium",
  showSettings = true,
  enableFilters = true,
  enableEffects = false
}: CameraCaptureProps) {
  const [mode, setMode] = useState<"photo" | "video" | "audio">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [microphoneDevices, setMicrophoneDevices] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [currentMicIndex, setCurrentMicIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState({ online: true, type: 'unknown' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerHaptic } = useHapticFeedback();
  const { checkPermissions, requestPermissions } = useMobilePermissions();
  const {
    isRecording: isMediaRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    recordingChunks,
    clearRecording
  } = useMediaRecorder();

  const {
    settings,
    updateSettings,
    resetSettings
  } = useCameraSettings({
    videoQuality: quality,
    audioQuality: quality,
    enableFlashlight: false,
    enableGrid: false,
    enableTimer: 0,
    enableFilters: enableFilters,
    currentFilter: "none",
    frontCamera: true,
    enableStabilization: true,
    enableHDR: false,
    enableLowLight: false,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    compressionLevel: 0.8
  });

  // Initialize camera and microphone devices
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const microphones = devices.filter(device => device.kind === "audioinput");

        setCameraDevices(cameras);
        setMicrophoneDevices(microphones);
      } catch (error) {
        console.error("Error enumerating devices:", error);
      }
    };

    initializeDevices();
  }, []);

  // Check battery level
  useEffect(() => {
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(battery.level * 100);

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100);
          });
        } catch (error) {
          console.error("Error getting battery level:", error);
        }
      }
    };

    checkBattery();
  }, []);

  // Check network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus({
        online: navigator.onLine,
        type: 'connection' in navigator ? (navigator as any).connection?.type || 'unknown' : 'unknown'
      });
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      // Check permissions first
      const hasPermissions = await checkPermissions({
        camera: mode !== "audio",
        microphone: mode !== "photo"
      });

      if (!hasPermissions.camera && mode !== "audio") {
        const granted = await requestPermissions({ camera: true });
        if (!granted.camera) {
          throw new Error("Camera permission denied");
        }
      }

      if (!hasPermissions.microphone && (mode === "video" || mode === "audio")) {
        const granted = await requestPermissions({ microphone: true });
        if (!granted.microphone) {
          throw new Error("Microphone permission denied");
        }
      }

      const constraints: MediaStreamConstraints = {
        video: mode !== "audio" ? {
          width: { ideal: VIDEO_QUALITIES[settings.videoQuality].width },
          height: { ideal: VIDEO_QUALITIES[settings.videoQuality].height },
          facingMode: settings.frontCamera ? "user" : "environment",
          deviceId: cameraDevices[currentCameraIndex]?.deviceId
        } : false,
        audio: mode !== "photo" ? {
          deviceId: microphoneDevices[currentMicIndex]?.deviceId,
          sampleRate: AUDIO_QUALITIES[settings.audioQuality].sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
    } catch (error) {
      console.error("Error starting camera:", error);
      setIsStreaming(false);
    }
  }, [mode, settings, currentCameraIndex, currentMicIndex, cameraDevices, microphoneDevices, checkPermissions, requestPermissions]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused, maxDuration]);

  // Handle photo capture
  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    if (settings.enableTimer > 0) {
      // Timer countdown
      let countdown = settings.enableTimer;
      const timerInterval = setInterval(async () => {
        if (countdown <= 0) {
          clearInterval(timerInterval);
          capturePhoto();
        }
        countdown--;
      }, 1000);
    } else {
      capturePhoto();
    }

    function capturePhoto() {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Apply filter if enabled
      if (settings.currentFilter !== "none") {
        context.filter = settings.currentFilter;
      }

      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now()
          });
          setCapturedMedia([file]);
          setShowPreview(true);
          triggerHaptic("success");
        }
      }, "image/jpeg", settings.compressionLevel);
    }
  }, [settings, triggerHaptic]);

  // Handle video recording
  const handleStartRecording = useCallback(async () => {
    try {
      const stream = streamRef.current;
      if (!stream) return;

      await startRecording(stream);
      setIsRecording(true);
      setRecordingTime(0);
      triggerHaptic("medium");
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [startRecording, triggerHaptic]);

  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();
      if (blob) {
        const file = new File([blob], `video_${Date.now()}.webm`, {
          type: "video/webm",
          lastModified: Date.now()
        });
        setCapturedMedia([file]);
        setShowPreview(true);
        triggerHaptic("success");
      }
      setIsRecording(false);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }, [stopRecording, triggerHaptic]);

  const handlePauseRecording = useCallback(() => {
    pauseRecording();
    setIsPaused(true);
    triggerHaptic("light");
  }, [pauseRecording, triggerHaptic]);

  const handleResumeRecording = useCallback(() => {
    resumeRecording();
    setIsPaused(false);
    triggerHaptic("light");
  }, [resumeRecording, triggerHaptic]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const nextIndex = (currentCameraIndex + 1) % cameraDevices.length;
    setCurrentCameraIndex(nextIndex);
    triggerHaptic("light");
  }, [currentCameraIndex, cameraDevices.length, triggerHaptic]);

  // Switch microphone
  const switchMicrophone = useCallback(() => {
    const nextIndex = (currentMicIndex + 1) % microphoneDevices.length;
    setCurrentMicIndex(nextIndex);
    triggerHaptic("light");
  }, [currentMicIndex, microphoneDevices.length, triggerHaptic]);

  // Handle capture confirmation
  const handleConfirmCapture = useCallback(() => {
    if (capturedMedia.length > 0) {
      onCapture?.(capturedMedia);
      setCapturedMedia([]);
      setShowPreview(false);
    }
  }, [capturedMedia, onCapture]);

  // Handle capture retake
  const handleRetakeCapture = useCallback(() => {
    setCapturedMedia([]);
    setShowPreview(false);
    clearRecording();
    triggerHaptic("light");
  }, [clearRecording, triggerHaptic]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if device supports flashlight
  const supportsFlashlight = () => {
    return 'torch' in navigator.mediaDevices.getSupportedConstraints();
  };

  // Toggle flashlight
  const toggleFlashlight = useCallback(async () => {
    if (!supportsFlashlight() || !streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      if ('torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{ torch: !settings.enableFlashlight }]
        });
        updateSettings({ enableFlashlight: !settings.enableFlashlight });
        triggerHaptic("light");
      }
    } catch (error) {
      console.error("Error toggling flashlight:", error);
    }
  }, [settings.enableFlashlight, updateSettings, triggerHaptic]);

  return (
    <div className={`camera-capture ${mobileOptimized ? 'mobile-optimized' : ''} h-full flex flex-col bg-black`}>
      {/* Camera View */}
      <div className="relative flex-1 overflow-hidden">
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Grid Overlay */}
            {settings.enableGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            )}

            {/* Timer Overlay */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Battery Indicator */}
            {batteryLevel !== null && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-2 py-1 rounded">
                {batteryLevel < 20 ? (
                  <BatteryLow className="w-4 h-4 text-red-500" />
                ) : (
                  <Battery className="w-4 h-4 text-green-500" />
                )}
                <span className="text-xs">{Math.round(batteryLevel)}%</span>
              </div>
            )}

            {/* Network Status */}
            <div className="absolute top-4 right-4 mt-8">
              {networkStatus.online ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>

            {/* Quality Indicator */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded flex items-center gap-1">
              {settings.videoQuality === "high" ? <Hd className="w-3 h-3" /> : <Sd className="w-3 h-3" />}
              <span className="text-xs uppercase">{settings.videoQuality}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <CameraOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black border-t border-gray-800">
        {/* Mode Selector */}
        <div className="flex justify-center gap-4 p-4 border-b border-gray-800">
          {allowPhoto && (
            <Button
              variant={mode === "photo" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("photo")}
              className="text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Photo
            </Button>
          )}
          {allowVideo && (
            <Button
              variant={mode === "video" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("video")}
              className="text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          )}
          {allowAudio && (
            <Button
              variant={mode === "audio" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("audio")}
              className="text-white"
            >
              <Mic className="w-4 h-4 mr-2" />
              Audio
            </Button>
          )}
        </div>

        {/* Capture Controls */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}

            {/* Camera Switch */}
            {mode !== "audio" && cameraDevices.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={switchCamera}
                className="text-white"
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
            )}

            {/* Microphone Switch */}
            {(mode === "video" || mode === "audio") && microphoneDevices.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={switchMicrophone}
                className="text-white"
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}

            {/* Flashlight Toggle */}
            {mode !== "audio" && supportsFlashlight() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFlashlight}
                className="text-white"
              >
                {settings.enableFlashlight ? (
                  <Flashlight className="w-5 h-5" />
                ) : (
                  <FlashlightOff className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>

          {/* Main Capture Button */}
          <div className="flex items-center gap-4">
            {/* Cancel Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={onCancel}
              className="text-white"
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Capture/Record Button */}
            {mode === "photo" ? (
              <Button
                size="lg"
                onClick={handleCapturePhoto}
                className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 text-black"
                disabled={!isStreaming}
              >
                <Camera className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={isRecording ? (isPaused ? handleResumeRecording : handlePauseRecording) : handleStartRecording}
                className={`w-16 h-16 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-gray-200'} ${isRecording ? 'text-white' : 'text-black'}`}
                disabled={!isStreaming}
              >
                {isRecording ? (
                  isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />
                ) : (
                  <Video className="w-6 h-6" />
                )}
              </Button>
            )}

            {/* Stop Recording Button (Video Mode) */}
            {mode === "video" && isRecording && (
              <Button
                size="lg"
                onClick={handleStopRecording}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-6 h-6" />
              </Button>
            )}

            {/* Download Button (for captured media) */}
            {capturedMedia.length > 0 && !showPreview && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowPreview(true)}
                className="text-white"
              >
                <Check className="w-6 h-6" />
              </Button>
            )}
          </div>

          <div className="w-20" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {capturedMedia.map((file, index) => (
              <div key={index} className="space-y-2">
                {file.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Captured photo"
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                )}
                {file.type.startsWith("video/") && (
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full h-auto max-h-96 rounded-lg"
                  />
                )}
                {file.type.startsWith("audio/") && (
                  <audio
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full"
                  />
                )}
                <div className="text-sm text-gray-600">
                  {file.name} - {formatFileSize(file.size)}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={handleRetakeCapture} variant="outline">
                Retake
              </Button>
              <Button onClick={handleConfirmCapture}>
                Use This
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Camera Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Video Quality */}
            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select
                value={settings.videoQuality}
                onValueChange={(value: "low" | "medium" | "high") =>
                  updateSettings({ videoQuality: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (640x480)</SelectItem>
                  <SelectItem value="medium">Medium (1280x720)</SelectItem>
                  <SelectItem value="high">High (1920x1080)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Audio Quality */}
            <div className="space-y-2">
              <Label>Audio Quality</Label>
              <Select
                value={settings.audioQuality}
                onValueChange={(value: "low" | "medium" | "high") =>
                  updateSettings({ audioQuality: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (32kbps)</SelectItem>
                  <SelectItem value="medium">Medium (64kbps)</SelectItem>
                  <SelectItem value="high">High (128kbps)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grid */}
            <div className="flex items-center justify-between">
              <Label htmlFor="grid">Show Grid</Label>
              <Switch
                id="grid"
                checked={settings.enableGrid}
                onCheckedChange={(checked) =>
                  updateSettings({ enableGrid: checked })
                }
              />
            </div>

            {/* Timer */}
            <div className="space-y-2">
              <Label>Timer</Label>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={settings.enableTimer === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ enableTimer: option.value })}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            {enableFilters && (
              <div className="space-y-2">
                <Label>Filters</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CAMERA_FILTERS.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={settings.currentFilter === filter.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ currentFilter: filter.id })}
                    >
                      {filter.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stabilization */}
            <div className="flex items-center justify-between">
              <Label htmlFor="stabilization">Video Stabilization</Label>
              <Switch
                id="stabilization"
                checked={settings.enableStabilization}
                onCheckedChange={(checked) =>
                  updateSettings({ enableStabilization: checked })
                }
              />
            </div>

            {/* HDR */}
            <div className="flex items-center justify-between">
              <Label htmlFor="hdr">HDR Mode</Label>
              <Switch
                id="hdr"
                checked={settings.enableHDR}
                onCheckedChange={(checked) =>
                  updateSettings({ enableHDR: checked })
                }
              />
            </div>

            {/* Low Light */}
            <div className="flex items-center justify-between">
              <Label htmlFor="lowlight">Low Light Mode</Label>
              <Switch
                id="lowlight"
                checked={settings.enableLowLight}
                onCheckedChange={(checked) =>
                  updateSettings({ enableLowLight: checked })
                }
              />
            </div>

            {/* Compression Level */}
            <div className="space-y-2">
              <Label>Compression Level: {Math.round(settings.compressionLevel * 100)}%</Label>
              <Slider
                value={[settings.compressionLevel]}
                onValueChange={([value]) =>
                  updateSettings({ compressionLevel: value })
                }
                min={0.1}
                max={1}
                step={0.1}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .camera-capture.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .camera-capture.mobile-optimized button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
