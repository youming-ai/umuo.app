"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  Camera,
  Image,
  Upload,
  Mic,
  Video,
  FileText,
  X,
  ChevronRight,
  Settings,
  HelpCircle,
  Smartphone,
  Wifi,
  WifiOff,
  Cloud,
  Clock,
  Star,
  Folder,
  Search,
  Filter,
  Grid3X3,
  List,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Share,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Zap,
  Shield,
  Lock,
  Unlock,
  Smartphone as MobileIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

import CameraCapture from "./CameraCapture";
import FilePreview from "./FilePreview";
import FileSourceSelector from "./FileSourceSelector";
import RecentFiles from "./RecentFiles";
import { useMobileFilePicker } from "./hooks/useMobileFilePicker";
import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useMobilePermissions } from "./hooks/useMobilePermissions";
import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_DOCUMENT_FORMATS,
  formatFileSize,
  type FileValidationOptions
} from "@/components/features/file-upload/FileValidation";

interface MobileFilePickerProps {
  className?: string;
  onFilesSelected?: (files: File[]) => void;
  onFileRemoved?: (index: number) => void;
  validationOptions?: FileValidationOptions;
  showRecentFiles?: boolean;
  showAdvancedOptions?: boolean;
  maxFiles?: number;
  autoUpload?: boolean;
  disabled?: boolean;
  source?: "camera" | "gallery" | "cloud" | "all";
  viewMode?: "grid" | "list";
  enableSearch?: boolean;
  enableFiltering?: boolean;
}

interface PickerSettings {
  autoUpload: boolean;
  wifiOnly: boolean;
  backgroundUpload: boolean;
  maxFileSize: number;
  maxFiles: number;
  enableHaptics: boolean;
  showPreviews: boolean;
  rememberSelection: boolean;
  enableCompression: boolean;
  compressionLevel: number;
}

interface NetworkStatus {
  online: boolean;
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

const MOBILE_FILE_CATEGORIES = [
  {
    id: "audio",
    name: "Audio",
    icon: Mic,
    description: "Record or upload audio files",
    formats: SUPPORTED_AUDIO_FORMATS,
    color: "bg-blue-500"
  },
  {
    id: "video",
    name: "Video",
    icon: Video,
    description: "Record or upload video files",
    formats: SUPPORTED_VIDEO_FORMATS,
    color: "bg-purple-500"
  },
  {
    id: "document",
    name: "Documents",
    icon: FileText,
    description: "Upload documents and text files",
    formats: SUPPORTED_DOCUMENT_FORMATS,
    color: "bg-green-500"
  },
  {
    id: "camera",
    name: "Camera",
    icon: Camera,
    description: "Take photos or record videos",
    formats: { ...SUPPORTED_VIDEO_FORMATS, "image/jpeg": { ext: ".jpg", name: "JPEG Image", maxSize: 50 * 1024 * 1024 } },
    color: "bg-red-500"
  }
];

export default function MobileFilePicker({
  className = "",
  onFilesSelected,
  onFileRemoved,
  validationOptions,
  showRecentFiles = true,
  showAdvancedOptions = false,
  maxFiles = 10,
  autoUpload = false,
  disabled = false,
  source = "all",
  viewMode = "grid",
  enableSearch = true,
  enableFiltering = true
}: MobileFilePickerProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(viewMode);
  const [showCamera, setShowCamera] = useState(false);
  const [showFileSource, setShowFileSource] = useState(false);
  const [pickerSettings, setPickerSettings] = useState<PickerSettings>({
    autoUpload,
    wifiOnly: true,
    backgroundUpload: false,
    maxFileSize: 300 * 1024 * 1024,
    maxFiles,
    enableHaptics: true,
    showPreviews: true,
    rememberSelection: true,
    enableCompression: false,
    compressionLevel: 0.7
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHapticFeedback();
  const { checkPermissions, requestPermissions } = useMobilePermissions();
  const {
    processFiles,
    isProcessing,
    processingProgress,
    processingError
  } = useMobileFilePicker({
    maxFiles,
    validationOptions,
    onSuccess: (files) => {
      onFilesSelected?.(files);
      setSelectedFiles(prev => [...prev, ...files]);
      if (pickerSettings.enableHaptics) {
        triggerHaptic("success");
      }
    },
    onError: (error) => {
      console.error("File processing error:", error);
      if (pickerSettings.enableHaptics) {
        triggerHaptic("error");
      }
    }
  });

  // Check network status on mount
  useEffect(() => {
    const updateNetworkStatus = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkStatus({
          online: navigator.onLine,
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        });
      } else {
        setNetworkStatus({
          online: navigator.onLine,
          type: 'unknown',
          effectiveType: 'unknown',
          downlink: 0,
          rtt: 0
        });
      }
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback(async (categoryId: string) => {
    if (pickerSettings.enableHaptics) {
      triggerHaptic("light");
    }

    setActiveCategory(categoryId);

    if (categoryId === "camera") {
      // Check camera permissions
      const hasPermission = await checkPermissions({ camera: true });
      if (!hasPermission.camera) {
        const granted = await requestPermissions({ camera: true });
        if (granted.camera) {
          setShowCamera(true);
        }
      } else {
        setShowCamera(true);
      }
    } else {
      // Set file input accept based on category
      const accept = getCategoryAcceptAttribute(categoryId);
      if (fileInputRef.current) {
        fileInputRef.current.accept = accept;
      }
      // Trigger file picker
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [pickerSettings.enableHaptics, triggerHaptic, checkPermissions, requestPermissions]);

  // Get accept attribute for file input based on category
  const getCategoryAcceptAttribute = (categoryId: string): string => {
    switch (categoryId) {
      case "audio":
        return Object.keys(SUPPORTED_AUDIO_FORMATS).join(',');
      case "video":
        return Object.keys(SUPPORTED_VIDEO_FORMATS).join(',');
      case "document":
        return Object.keys(SUPPORTED_DOCUMENT_FORMATS).join(',');
      case "camera":
        return "image/*,video/*";
      default:
        return Object.keys({
          ...SUPPORTED_AUDIO_FORMATS,
          ...SUPPORTED_VIDEO_FORMATS,
          ...SUPPORTED_DOCUMENT_FORMATS
        }).join(',');
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (pickerSettings.enableHaptics) {
      triggerHaptic("medium");
    }

    const fileArray = Array.from(files);

    // Check file count limit
    if (selectedFiles.length + fileArray.length > pickerSettings.maxFiles) {
      alert(`Maximum ${pickerSettings.maxFiles} files allowed`);
      return;
    }

    // Process files with validation
    processFiles(fileArray);
  }, [selectedFiles.length, pickerSettings, processFiles, triggerHaptic]);

  // Handle file removal
  const handleFileRemove = useCallback((index: number) => {
    if (pickerSettings.enableHaptics) {
      triggerHaptic("light");
    }

    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    onFileRemoved?.(index);
  }, [pickerSettings.enableHaptics, triggerHaptic, onFileRemoved]);

  // Handle camera capture
  const handleCameraCapture = useCallback((files: File[]) => {
    if (pickerSettings.enableHaptics) {
      triggerHaptic("success");
    }

    setShowCamera(false);
    processFiles(files);
  }, [pickerSettings.enableHaptics, triggerHaptic, processFiles]);

  // Handle recent file selection
  const handleRecentFileSelect = useCallback((files: File[]) => {
    if (pickerSettings.enableHaptics) {
      triggerHaptic("light");
    }

    processFiles(files);
  }, [pickerSettings.enableHaptics, triggerHaptic, processFiles]);

  // Check if network conditions are suitable for upload
  const isNetworkOptimal = useCallback(() => {
    if (!networkStatus || !networkStatus.online) return false;
    if (pickerSettings.wifiOnly && networkStatus.type !== 'wifi') return false;
    if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') return false;
    return true;
  }, [networkStatus, pickerSettings.wifiOnly]);

  // Filter files based on search query
  const filteredFiles = selectedFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render network status indicator
  const renderNetworkStatus = () => {
    if (!networkStatus) return null;

    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        {networkStatus.online ? (
          pickerSettings.wifiOnly && networkStatus.type !== 'wifi' ? (
            <WifiOff className="w-4 h-4 text-orange-500" />
          ) : (
            <Wifi className="w-4 h-4 text-green-500" />
          )
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs text-gray-600">
          {networkStatus.online
            ? networkStatus.effectiveType
            : 'Offline'
          }
        </span>
      </div>
    );
  };

  return (
    <div className={`mobile-file-picker ${className}`}>
      {/* Network Status */}
      {renderNetworkStatus()}

      {/* Main Content */}
      <div className="space-y-4">
        {/* Categories Grid */}
        <div className="grid grid-cols-2 gap-3">
          {MOBILE_FILE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = activeCategory === category.id;

            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-center gap-2 relative overflow-hidden"
                onClick={() => handleCategorySelect(category.id)}
                disabled={disabled}
              >
                <div className={`w-12 h-12 rounded-full ${category.color} bg-opacity-10 flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-current" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {category.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Search and Filters */}
        {enableSearch && selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {enableFiltering && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Selected Files */}
        {filteredFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">
                Selected Files ({filteredFiles.length}/{pickerSettings.maxFiles})
              </h3>
              {showAdvancedOptions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>

            <ScrollArea className="h-64">
              <div className={`grid gap-2 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
                {filteredFiles.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${index}`}
                    file={file}
                    index={index}
                    viewMode={viewMode}
                    onRemove={() => handleFileRemove(index)}
                    onPreview={() => setSelectedFileIndex(index)}
                    showRemove={true}
                    mobileOptimized={true}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recent Files */}
        {showRecentFiles && (
          <RecentFiles
            onFileSelect={handleRecentFileSelect}
            maxFiles={pickerSettings.maxFiles - selectedFiles.length}
            mobileOptimized={true}
          />
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Processing files...</div>
                  <Progress value={processingProgress} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {processingError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <div className="text-sm">{processingError.message}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getCategoryAcceptAttribute(activeCategory)}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Camera Capture</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <CameraCapture
              onCapture={handleCameraCapture}
              onCancel={() => setShowCamera(false)}
              mobileOptimized={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      {showAdvancedOptions && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>File Picker Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-upload">Auto Upload</Label>
                <Switch
                  id="auto-upload"
                  checked={pickerSettings.autoUpload}
                  onCheckedChange={(checked) =>
                    setPickerSettings(prev => ({ ...prev, autoUpload: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="wifi-only">WiFi Only</Label>
                <Switch
                  id="wifi-only"
                  checked={pickerSettings.wifiOnly}
                  onCheckedChange={(checked) =>
                    setPickerSettings(prev => ({ ...prev, wifiOnly: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="haptics">Haptic Feedback</Label>
                <Switch
                  id="haptics"
                  checked={pickerSettings.enableHaptics}
                  onCheckedChange={(checked) =>
                    setPickerSettings(prev => ({ ...prev, enableHaptics: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="previews">Show Previews</Label>
                <Switch
                  id="previews"
                  checked={pickerSettings.showPreviews}
                  onCheckedChange={(checked) =>
                    setPickerSettings(prev => ({ ...prev, showPreviews: checked }))
                  }
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile-optimized styles */}
      <style jsx>{`
        .mobile-file-picker {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .mobile-file-picker button {
            min-height: 44px;
            min-width: 44px;
          }
        }

        @media (max-width: 480px) {
          .mobile-file-picker {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
