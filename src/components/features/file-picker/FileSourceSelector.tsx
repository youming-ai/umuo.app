"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Camera,
  Image,
  Video,
  Mic,
  FileText,
  Upload,
  Folder,
  Cloud,
  CloudDownload,
  Wifi,
  WifiOff,
  Smartphone,
  Laptop,
  Tablet,
  HardDrive,
  Usb,
  Bluetooth,
  Share2,
  Link,
  QrCode,
  Scan,
  ExternalLink,
  Settings,
  Info,
  Shield,
  Lock,
  Unlock,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Zap,
  Clock,
  Star,
  History,
  Google,
  Dropbox,
  Microsoft,
  Apple,
  Github,
  Figma,
  Slack,
  Notion,
  Evernote,
  Box,
  Drive,
  Photos,
  Music,
  Film,
  Archive,
  File
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useCloudStorage } from "./hooks/useCloudStorage";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useDeviceCapabilities } from "./hooks/useDeviceCapabilities";
import { useMobilePermissions } from "./hooks/useMobilePermissions";

interface FileSourceSelectorProps {
  onSourceSelected?: (source: FileSource) => void;
  onFilesSelected?: (files: File[]) => void;
  onCameraOpen?: () => void;
  onCancel?: () => void;
  mobileOptimized?: boolean;
  allowCamera?: boolean;
  allowGallery?: boolean;
  allowCloudStorage?: boolean;
  allowLocalFiles?: boolean;
  allowUrlImport?: boolean;
  allowQrCode?: boolean;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
}

interface FileSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: "camera" | "gallery" | "cloud" | "local" | "url" | "qr" | "device";
  enabled: boolean;
  requiresPermission?: string[];
  supportedFormats?: string[];
  maxSize?: number;
  networkRequired?: boolean;
  priority?: number;
  category?: "primary" | "secondary" | "advanced";
}

interface CloudStorageProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  connected: boolean;
  requiresAuth: boolean;
  supportedFormats: string[];
  maxFileSize: number;
  features: string[];
}

const DEVICE_SOURCES: FileSource[] = [
  {
    id: "camera",
    name: "Camera",
    description: "Take photos or record videos",
    icon: <Camera className="w-5 h-5" />,
    type: "camera",
    enabled: true,
    requiresPermission: ["camera"],
    supportedFormats: ["image/*", "video/*"],
    maxSize: 100 * 1024 * 1024, // 100MB
    priority: 1,
    category: "primary"
  },
  {
    id: "gallery",
    name: "Photo Gallery",
    description: "Select from device gallery",
    icon: <Image className="w-5 h-5" />,
    type: "gallery",
    enabled: true,
    requiresPermission: ["photos"],
    supportedFormats: ["image/*", "video/*"],
    maxSize: 50 * 1024 * 1024, // 50MB
    priority: 2,
    category: "primary"
  },
  {
    id: "files",
    name: "Device Files",
    description: "Browse local file system",
    icon: <Folder className="w-5 h-5" />,
    type: "local",
    enabled: true,
    requiresPermission: ["storage"],
    supportedFormats: ["*/*"],
    maxSize: 500 * 1024 * 1024, // 500MB
    priority: 3,
    category: "primary"
  },
  {
    id: "voice",
    name: "Voice Recorder",
    description: "Record audio notes",
    icon: <Mic className="w-5 h-5" />,
    type: "camera",
    enabled: true,
    requiresPermission: ["microphone"],
    supportedFormats: ["audio/*"],
    maxSize: 50 * 1024 * 1024, // 50MB
    priority: 4,
    category: "secondary"
  }
];

const CLOUD_PROVIDERS: CloudStorageProvider[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    icon: <Google className="w-5 h-5" />,
    enabled: true,
    connected: false,
    requiresAuth: true,
    supportedFormats: ["*/*"],
    maxFileSize: 100 * 1024 * 1024,
    features: ["sync", "sharing", "collaboration"]
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: <Dropbox className="w-5 h-5" />,
    enabled: true,
    connected: false,
    requiresAuth: true,
    supportedFormats: ["*/*"],
    maxFileSize: 150 * 1024 * 1024,
    features: ["sync", "sharing", "version-history"]
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: <Microsoft className="w-5 h-5" />,
    enabled: true,
    connected: false,
    requiresAuth: true,
    supportedFormats: ["*/*"],
    maxFileSize: 250 * 1024 * 1024,
    features: ["sync", "sharing", "office-integration"]
  },
  {
    id: "icloud",
    name: "iCloud",
    icon: <Apple className="w-5 h-5" />,
    enabled: true,
    connected: false,
    requiresAuth: true,
    supportedFormats: ["image/*", "video/*", "document/*"],
    maxFileSize: 50 * 1024 * 1024,
    features: ["sync", "photos", "backup"]
  }
];

const ADVANCED_SOURCES: FileSource[] = [
  {
    id: "url",
    name: "URL Import",
    description: "Import from web URL",
    icon: <Link className="w-5 h-5" />,
    type: "url",
    enabled: true,
    supportedFormats: ["*/*"],
    networkRequired: true,
    priority: 5,
    category: "advanced"
  },
  {
    id: "qr",
    name: "QR Code Scan",
    description: "Scan QR code for files",
    icon: <QrCode className="w-5 h-5" />,
    type: "qr",
    enabled: true,
    requiresPermission: ["camera"],
    supportedFormats: ["*/*"],
    networkRequired: true,
    priority: 6,
    category: "advanced"
  },
  {
    id: "bluetooth",
    name: "Bluetooth Transfer",
    description: "Receive via Bluetooth",
    icon: <Bluetooth className="w-5 h-5" />,
    type: "device",
    enabled: true,
    requiresPermission: ["bluetooth"],
    supportedFormats: ["*/*"],
    priority: 7,
    category: "advanced"
  },
  {
    id: "usb",
    name: "USB Drive",
    description: "Import from USB storage",
    icon: <Usb className="w-5 h-5" />,
    type: "device",
    enabled: false, // Requires special APIs
    supportedFormats: ["*/*"],
    maxSize: 32 * 1024 * 1024 * 1024, // 32GB
    priority: 8,
    category: "advanced"
  }
];

export default function FileSourceSelector({
  onSourceSelected,
  onFilesSelected,
  onCameraOpen,
  onCancel,
  mobileOptimized = true,
  allowCamera = true,
  allowGallery = true,
  allowCloudStorage = true,
  allowLocalFiles = true,
  allowUrlImport = true,
  allowQrCode = true,
  allowedFileTypes,
  maxFileSize,
  maxFiles
}: FileSourceSelectorProps) {
  const [selectedSource, setSelectedSource] = useState<FileSource | null>(null);
  const [activeTab, setActiveTab] = useState("device");
  const [importUrl, setImportUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Record<string, boolean>>({});

  const { triggerHaptic } = useHapticFeedback();
  const { checkPermissions, requestPermissions } = useMobilePermissions();
  const { isOnline, connectionType, effectiveType } = useNetworkStatus();
  const {
    hasCamera,
    hasMicrophone,
    hasBluetooth,
    hasUsb,
    deviceType,
    os
  } = useDeviceCapabilities();
  const {
    connectProvider,
    disconnectProvider,
    listFiles,
    downloadFile,
    getProviderStatus
  } = useCloudStorage();

  // Filter sources based on device capabilities and settings
  const availableSources = DEVICE_SOURCES.filter(source => {
    // Filter based on props
    if (!allowCamera && source.type === "camera") return false;
    if (!allowGallery && source.id === "gallery") return false;
    if (!allowLocalFiles && source.type === "local") return false;

    // Filter based on device capabilities
    if (source.id === "camera" && !hasCamera) return false;
    if (source.id === "voice" && !hasMicrophone) return false;
    if (source.id === "bluetooth" && !hasBluetooth) return false;
    if (source.id === "usb" && !hasUsb) return false;

    // Filter based on network requirements
    if (source.networkRequired && !isOnline) return false;

    return source.enabled;
  });

  const availableCloudProviders = CLOUD_PROVIDERS.filter(provider =>
    provider.enabled && allowCloudStorage
  );

  const availableAdvancedSources = ADVANCED_SOURCES.filter(source => {
    if (!allowUrlImport && source.type === "url") return false;
    if (!allowQrCode && source.type === "qr") return false;
    if (source.networkRequired && !isOnline) return false;
    return source.enabled;
  });

  // Check permissions for sources that require them
  useEffect(() => {
    const checkSourcePermissions = async () => {
      const status: Record<string, boolean> = {};

      for (const source of availableSources) {
        if (source.requiresPermission) {
          const hasPermission = await checkPermissions({
            camera: source.requiresPermission.includes("camera"),
            microphone: source.requiresPermission.includes("microphone"),
            storage: source.requiresPermission.includes("storage"),
            photos: source.requiresPermission.includes("photos"),
            bluetooth: source.requiresPermission.includes("bluetooth")
          });

          status[source.id] = Object.values(hasPermission).some(p => p);
        }
      }

      setPermissionStatus(status);
    };

    checkSourcePermissions();
  }, [availableSources, checkPermissions]);

  // Handle source selection
  const handleSourceSelect = useCallback(async (source: FileSource) => {
    setSelectedSource(source);
    triggerHaptic("medium");

    // Check permissions if required
    if (source.requiresPermission && source.requiresPermission.length > 0) {
      const permissionMap = {
        camera: source.requiresPermission.includes("camera"),
        microphone: source.requiresPermission.includes("microphone"),
        storage: source.requiresPermission.includes("storage"),
        photos: source.requiresPermission.includes("photos"),
        bluetooth: source.requiresPermission.includes("bluetooth")
      };

      const hasPermission = await checkPermissions(permissionMap);
      const needsPermission = !Object.values(hasPermission).every(p => p);

      if (needsPermission) {
        const granted = await requestPermissions(permissionMap);
        if (!Object.values(granted).every(p => p)) {
          alert("Permission required to use this source");
          return;
        }
      }
    }

    // Handle different source types
    switch (source.type) {
      case "camera":
        if (onCameraOpen) {
          onCameraOpen();
        }
        break;

      case "gallery":
        // Trigger file picker with image/video filter
        const input = document.createElement("input");
        input.type = "file";
        input.accept = source.supportedFormats?.join(",") || "image/*,video/*";
        input.multiple = true;
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && onFilesSelected) {
            onFilesSelected(Array.from(files));
          }
        };
        input.click();
        break;

      case "local":
        // Trigger file picker for all files
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = allowedFileTypes?.join(",") || "*/*";
        fileInput.multiple = true;
        fileInput.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && onFilesSelected) {
            onFilesSelected(Array.from(files));
          }
        };
        fileInput.click();
        break;

      case "url":
        setActiveTab("url");
        break;

      case "qr":
        setActiveTab("qr");
        setIsScanning(true);
        break;

      case "device":
        // Handle device-specific imports
        if (source.id === "bluetooth") {
          // Implement Bluetooth file transfer
          console.log("Bluetooth file transfer not implemented");
        }
        break;
    }

    onSourceSelected?.(source);
  }, [triggerHaptic, checkPermissions, requestPermissions, onSourceSelected, onFilesSelected, onCameraOpen, allowedFileTypes]);

  // Handle URL import
  const handleUrlImport = useCallback(async () => {
    if (!importUrl.trim()) return;

    try {
      // Validate URL
      const url = new URL(importUrl);

      // Download file from URL
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const fileName = url.pathname.split("/").pop() || "downloaded-file";
      const file = new File([blob], fileName, { type: blob.type });

      onFilesSelected?.([file]);
      setImportUrl("");
      triggerHaptic("success");
    } catch (error) {
      console.error("URL import failed:", error);
      alert("Failed to import file from URL");
      triggerHaptic("error");
    }
  }, [importUrl, onFilesSelected, triggerHaptic]);

  // Handle cloud provider connection
  const handleCloudProviderConnect = useCallback(async (providerId: string) => {
    try {
      const provider = CLOUD_PROVIDERS.find(p => p.id === providerId);
      if (!provider) return;

      if (provider.connected) {
        await disconnectProvider(providerId);
        triggerHaptic("light");
      } else {
        await connectProvider(providerId);
        triggerHaptic("success");
      }
    } catch (error) {
      console.error("Cloud provider connection failed:", error);
      triggerHaptic("error");
    }
  }, [connectProvider, disconnectProvider, triggerHaptic]);

  // Handle QR code scanning
  const handleQrCodeScan = useCallback((data: string) => {
    try {
      // Parse QR code data (could be URL, file info, etc.)
      if (data.startsWith("http://") || data.startsWith("https://")) {
        setImportUrl(data);
        setActiveTab("url");
      } else {
        // Handle other QR code formats
        console.log("QR Code data:", data);
      }

      setIsScanning(false);
      triggerHaptic("success");
    } catch (error) {
      console.error("QR code parsing failed:", error);
      triggerHaptic("error");
    }
  }, [triggerHaptic]);

  // Render source card
  const renderSourceCard = (source: FileSource) => {
    const hasPermission = source.requiresPermission
      ? permissionStatus[source.id]
      : true;

    return (
      <TooltipProvider key={source.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedSource?.id === source.id ? "ring-2 ring-blue-500" : ""
              } ${!hasPermission ? "opacity-50" : ""} ${
                mobileOptimized ? "touch-manipulation" : ""
              }`}
              onClick={() => handleSourceSelect(source)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {source.icon}
                  </div>
                  <div className="text-sm font-medium">{source.name}</div>
                  <div className="text-xs text-gray-500">{source.description}</div>
                  {!hasPermission && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Permission Required
                    </Badge>
                  )}
                  {source.networkRequired && !isOnline && (
                    <Badge variant="outline" className="text-xs text-red-500">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{source.name}</div>
              {source.supportedFormats && (
                <div className="text-xs text-gray-500">
                  Supports: {source.supportedFormats.slice(0, 3).join(", ")}
                  {source.supportedFormats.length > 3 && "..."}
                </div>
              )}
              {source.maxSize && (
                <div className="text-xs text-gray-500">
                  Max size: {formatFileSize(source.maxSize)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render cloud provider card
  const renderCloudProviderCard = (provider: CloudStorageProvider) => (
    <Card key={provider.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              {provider.icon}
            </div>
            <div>
              <div className="font-medium">{provider.name}</div>
              <div className="text-xs text-gray-500">
                {provider.connected ? "Connected" : "Not connected"}
              </div>
            </div>
          </div>
          <Button
            variant={provider.connected ? "outline" : "default"}
            size="sm"
            onClick={() => handleCloudProviderConnect(provider.id)}
          >
            {provider.connected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`file-source-selector ${mobileOptimized ? "mobile-optimized" : ""}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="device">Device</TabsTrigger>
          <TabsTrigger value="cloud">Cloud</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
        </TabsList>

        <TabsContent value="device" className="space-y-4">
          {/* Network Status */}
          {!isOnline && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-orange-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">Offline mode - some features may be limited</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Sources */}
          <div className="grid grid-cols-2 gap-4">
            {availableSources
              .filter(source => source.category === "primary")
              .map(renderSourceCard)}
          </div>

          {/* Secondary Sources */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Other Options</h3>
            <div className="grid grid-cols-2 gap-4">
              {availableSources
                .filter(source => source.category === "secondary")
                .map(renderSourceCard)}
            </div>
          </div>

          {/* Advanced Options */}
          {availableAdvancedSources.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between"
              >
                Advanced Options
                <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
              </Button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4">
                  {availableAdvancedSources.map(renderSourceCard)}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cloud" className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Cloud Storage Providers</h3>
            {availableCloudProviders.length > 0 ? (
              <div className="space-y-2">
                {availableCloudProviders.map(renderCloudProviderCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Cloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No cloud storage providers available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="url-input">File URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/file.mp3"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleUrlImport}
                disabled={!importUrl.trim() || !isOnline}
                className="w-full"
              >
                <CloudDownload className="w-4 h-4 mr-2" />
                Import File
              </Button>
              {importUrl && (
                <div className="text-xs text-gray-500">
                  This will download the file from the provided URL
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {isScanning ? (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-500">Scanning QR code...</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsScanning(false)}
                      className="mt-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Scan QR code to import files</p>
                    <Button onClick={() => setIsScanning(true)}>
                      <Scan className="w-4 h-4 mr-2" />
                      Start Scanning
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <style jsx>{`
        .file-source-selector.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .file-source-selector button {
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
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
