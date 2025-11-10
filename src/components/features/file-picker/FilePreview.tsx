"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Music,
  Video,
  Image,
  Download,
  Share,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Clock,
  Star,
  Bookmark,
  BookmarkMinus,
  ExternalLink,
  FileAudio,
  Film,
  FileImage,
  File,
  Info,
  Settings,
  RefreshCw,
  Shield,
  Lock,
  Unlock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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

import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useFileThumbnails } from "./hooks/useFileThumbnails";
import { formatFileSize } from "@/components/features/file-upload/FileValidation";
import type { FileValidationResult } from "@/components/features/file-upload/FileValidation";

interface FilePreviewProps {
  file: File;
  index?: number;
  viewMode?: "grid" | "list";
  onRemove?: (index: number) => void;
  onPreview?: (file: File) => void;
  onDownload?: (file: File) => void;
  onShare?: (file: File) => void;
  onDuplicate?: (file: File) => void;
  showRemove?: boolean;
  showActions?: boolean;
  showMetadata?: boolean;
  mobileOptimized?: boolean;
  validation?: FileValidationResult;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  compact?: boolean;
}

interface FileMetadata {
  duration?: number;
  dimensions?: { width: number; height: number };
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  fps?: number;
  codec?: string;
  creationDate?: Date;
  modificationDate?: Date;
  gps?: { latitude: number; longitude: number };
  camera?: { make: string; model: string };
  size: number;
  type: string;
  name: string;
}

interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
  format: "image/jpeg" | "image/webp" | "image/png";
  background?: string;
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 200,
  height: 200,
  quality: 0.8,
  format: "image/jpeg",
  background: "#f3f4f6"
};

const FILE_ICONS = {
  "audio": Music,
  "video": Video,
  "image": Image,
  "document": FileText,
  "default": File
};

export default function FilePreview({
  file,
  index = 0,
  viewMode = "grid",
  onRemove,
  onPreview,
  onDownload,
  onShare,
  onDuplicate,
  showRemove = true,
  showActions = true,
  showMetadata = true,
  mobileOptimized = true,
  validation,
  selectable = false,
  selected = false,
  onSelectionChange,
  compact = false
}: FilePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { triggerHaptic } = useHapticFeedback();
  const {
    thumbnail,
    generateThumbnail,
    isGeneratingThumbnail
  } = useFileThumbnails(DEFAULT_THUMBNAIL_OPTIONS);

  // Extract file metadata
  useEffect(() => {
    const extractMetadata = async () => {
      try {
        setIsLoading(true);
        const meta: FileMetadata = {
          size: file.size,
          type: file.type,
          name: file.name,
          creationDate: new Date(file.lastModified)
        };

        // Extract video metadata
        if (file.type.startsWith("video/") && videoRef.current) {
          const video = videoRef.current;
          video.src = URL.createObjectURL(file);

          await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
          });

          meta.duration = video.duration;
          meta.dimensions = { width: video.videoWidth, height: video.videoHeight };
          meta.bitrate = (file.size * 8) / video.duration; // bits per second
          meta.fps = 30; // Default, would need more complex extraction
        }

        // Extract audio metadata
        if (file.type.startsWith("audio/") && audioRef.current) {
          const audio = audioRef.current;
          audio.src = URL.createObjectURL(file);

          await new Promise((resolve) => {
            audio.onloadedmetadata = resolve;
          });

          meta.duration = audio.duration;
          meta.sampleRate = (audio as any).sampleRate || 44100;
        }

        // Extract image metadata
        if (file.type.startsWith("image/")) {
          const img = new Image();
          img.src = URL.createObjectURL(file);

          await new Promise((resolve) => {
            img.onload = resolve;
          });

          meta.dimensions = { width: img.width, height: img.height };
        }

        setMetadata(meta);
      } catch (error) {
        console.error("Error extracting metadata:", error);
        setError("Failed to load metadata");
      } finally {
        setIsLoading(false);
      }
    };

    extractMetadata();
  }, [file]);

  // Generate thumbnail on mount
  useEffect(() => {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      generateThumbnail(file);
    }
  }, [file, generateThumbnail]);

  // Handle file selection
  const handleSelectionChange = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(!selected);
      triggerHaptic("light");
    }
  }, [selected, onSelectionChange, triggerHaptic]);

  // Handle file removal
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(index);
      triggerHaptic("medium");
    }
  }, [index, onRemove, triggerHaptic]);

  // Handle file preview
  const handlePreview = useCallback(() => {
    setShowPreview(true);
    if (onPreview) {
      onPreview(file);
    }
    triggerHaptic("light");
  }, [file, onPreview, triggerHaptic]);

  // Handle file download
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(file);
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    triggerHaptic("success");
  }, [file, onDownload, triggerHaptic]);

  // Handle file sharing
  const handleShare = useCallback(async () => {
    if (navigator.share && onShare) {
      try {
        await navigator.share({
          title: file.name,
          text: `Sharing ${file.name}`,
          files: [file]
        });
        triggerHaptic("success");
      } catch (error) {
        console.error("Error sharing file:", error);
      }
    } else if (onShare) {
      onShare(file);
    }
  }, [file, onShare, triggerHaptic]);

  // Handle file duplication
  const handleDuplicate = useCallback(() => {
    if (onDuplicate) {
      onDuplicate(file);
      triggerHaptic("light");
    }
  }, [file, onDuplicate, triggerHaptic]);

  // Get file icon
  const getFileIcon = () => {
    if (file.type.startsWith("audio/")) return FILE_ICONS.audio;
    if (file.type.startsWith("video/")) return FILE_ICONS.video;
    if (file.type.startsWith("image/")) return FILE_ICONS.image;
    if (file.type.includes("document") || file.type.includes("pdf")) return FILE_ICONS.document;
    return FILE_ICONS.default;
  };

  // Get file type badge color
  const getFileTypeBadgeColor = () => {
    if (file.type.startsWith("audio/")) return "bg-blue-500";
    if (file.type.startsWith("video/")) return "bg-purple-500";
    if (file.type.startsWith("image/")) return "bg-green-500";
    if (file.type.includes("document") || file.type.includes("pdf")) return "bg-orange-500";
    return "bg-gray-500";
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render file content
  const renderFileContent = () => {
    if (file.type.startsWith("image/")) {
      if (thumbnail) {
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <img
              src={thumbnail}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {isGeneratingThumbnail && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm">Loading...</div>
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
          <FileImage className="w-12 h-12 text-gray-400" />
        </div>
      );
    }

    if (file.type.startsWith("video/")) {
      if (thumbnail) {
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <img
              src={thumbnail}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-8 h-8 text-white/80" />
            </div>
            {metadata?.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(metadata.duration)}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
          <Film className="w-12 h-12 text-gray-400" />
        </div>
      );
    }

    if (file.type.startsWith("audio/")) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center rounded-lg">
          <FileAudio className="w-12 h-12 text-white" />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
        <FileText className="w-12 h-12 text-gray-400" />
      </div>
    );
  };

  // Render grid view
  const renderGridView = () => (
    <Card className={`group hover:shadow-lg transition-shadow cursor-pointer relative ${
      selected ? 'ring-2 ring-blue-500' : ''
    } ${mobileOptimized ? 'touch-manipulation' : ''}`}>
      {selectable && (
        <div
          className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center"
          onClick={handleSelectionChange}
        >
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      )}

      {showRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      <CardContent
        className="p-0 aspect-square"
        onClick={handlePreview}
      >
        {renderFileContent()}
      </CardContent>

      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(file.size)}
            </Badge>

            <div className={`w-2 h-2 rounded-full ${getFileTypeBadgeColor()}`} />
          </div>

          {validation && (
            <div className="space-y-1">
              {validation.errors.length > 0 && (
                <div className="flex items-center gap-1 text-red-500 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{validation.errors.length} errors</span>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="flex items-center gap-1 text-yellow-500 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{validation.warnings.length} warnings</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render list view
  const renderListView = () => (
    <Card className={`group hover:bg-gray-50 transition-colors cursor-pointer ${
      selected ? 'ring-2 ring-blue-500' : ''
    } ${mobileOptimized ? 'touch-manipulation' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {selectable && (
            <div
              className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center flex-shrink-0"
              onClick={handleSelectionChange}
            >
              {selected && <Check className="w-3 h-3 text-blue-500" />}
            </div>
          )}

          <div className="w-16 h-16 flex-shrink-0" onClick={handlePreview}>
            {renderFileContent()}
          </div>

          <div className="flex-1 min-w-0" onClick={handlePreview}>
            <div className="space-y-1">
              <div className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Badge variant="outline" className="text-xs">
                  {file.type.split('/')[0]?.toUpperCase() || 'FILE'}
                </Badge>
                <span>{formatFileSize(file.size)}</span>
                {metadata?.duration && (
                  <span>{formatDuration(metadata.duration)}</span>
                )}
              </div>

              {validation && (
                <div className="flex items-center gap-2 text-xs">
                  {validation.errors.length > 0 && (
                    <span className="text-red-500">
                      {validation.errors.length} errors
                    </span>
                  )}
                  {validation.warnings.length > 0 && (
                    <span className="text-yellow-500">
                      {validation.warnings.length} warnings
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDownload && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        className="w-8 h-8 p-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {onShare && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShare}
                        className="w-8 h-8 p-0"
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handlePreview}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {showRemove && (
                    <DropdownMenuItem
                      onClick={handleRemove}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="file-preview">
      {viewMode === "grid" ? renderGridView() : renderListView()}

      {/* Hidden media elements for metadata extraction */}
      <video ref={videoRef} className="hidden" />
      <audio ref={audioRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{file.name}</span>
              <div className="flex items-center gap-2">
                {metadata && (
                  <Badge variant="outline">
                    {formatFileSize(metadata.size)}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Content Preview */}
            <div className="flex justify-center">
              {file.type.startsWith("image/") && (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="max-w-full max-h-96 object-contain rounded-lg"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              )}

              {file.type.startsWith("video/") && (
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  className="max-w-full max-h-96 rounded-lg"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                />
              )}

              {file.type.startsWith("audio/") && (
                <div className="w-full max-w-md">
                  <audio
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onVolumeChange={(e) => {
                      setVolume(e.currentTarget.volume);
                      setIsMuted(e.currentTarget.muted);
                    }}
                  />

                  {/* Visual audio representation */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <div className="h-16 flex items-center justify-center">
                      {isPlaying ? (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-white rounded-full animate-pulse"
                              style={{
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.1}s`
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <FileAudio className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!file.type.startsWith("image/") &&
               !file.type.startsWith("video/") &&
               !file.type.startsWith("audio/") && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  {React.createElement(getFileIcon(), {
                    className: "w-16 h-16 text-gray-400"
                  })}
                </div>
              )}
            </div>

            {/* Metadata Display */}
            {metadata && showMetadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    File Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Type:</span> {file.type}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {formatFileSize(metadata.size)}
                    </div>
                    <div>
                      <span className="font-medium">Modified:</span> {metadata.modificationDate?.toLocaleString()}
                    </div>
                    {metadata.duration && (
                      <div>
                        <span className="font-medium">Duration:</span> {formatDuration(metadata.duration)}
                      </div>
                    )}
                    {metadata.dimensions && (
                      <div>
                        <span className="font-medium">Dimensions:</span> {metadata.dimensions.width}×{metadata.dimensions.height}
                      </div>
                    )}
                    {metadata.bitrate && (
                      <div>
                        <span className="font-medium">Bitrate:</span> {Math.round(metadata.bitrate / 1000)} kbps
                      </div>
                    )}
                    {metadata.sampleRate && (
                      <div>
                        <span className="font-medium">Sample Rate:</span> {metadata.sampleRate} Hz
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {file.type.startsWith("image/") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation((rotation + 90) % 360)}
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onDownload && (
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                {onShare && (
                  <Button variant="outline" onClick={handleShare}>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .file-preview {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .file-preview button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
