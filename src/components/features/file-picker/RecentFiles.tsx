"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Star,
  FileText,
  Music,
  Video,
  Image,
  Download,
  Share,
  Eye,
  Trash2,
  Copy,
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Tag,
  Folder,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  History,
  Bookmark,
  BookmarkMinus,
  Heart,
  Archive,
  Grid3X3,
  List,
  Settings,
  Wifi,
  WifiOff,
  Smartphone,
  Cloud,
  CloudDownload,
  FolderOpen,
  File,
  FileAudio,
  FileVideo,
  FileImage,
  FileText as FileTextIcon,
  Lock,
  Unlock,
  Shield,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Timer,
  TimerOff
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useHapticFeedback } from "./hooks/useHapticFeedback";
import { useFileCache } from "./hooks/useFileCache";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatFileSize, type FileValidationResult } from "@/components/features/file-upload/FileValidation";
import type { FileRow } from "@/types/db/database";

interface RecentFilesProps {
  onFileSelect?: (files: File[]) => void;
  maxFiles?: number;
  mobileOptimized?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showSortOptions?: boolean;
  viewMode?: "grid" | "list";
  allowSelection?: boolean;
  allowFavorites?: boolean;
  allowOffline?: boolean;
  allowedTypes?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface RecentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  blob?: Blob;
  thumbnail?: string;
  lastAccessed: Date;
  accessCount: number;
  isFavorite: boolean;
  isOffline: boolean;
  isCloudFile: boolean;
  tags: string[];
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    bitrate?: number;
    sampleRate?: number;
    [key: string]: any;
  };
  source?: "upload" | "camera" | "cloud" | "import";
}

interface FileFilter {
  type: string[];
  tags: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  sizeRange: {
    min?: number;
    max?: number;
  };
  favorites: boolean;
  offline: boolean;
}

interface FileSort {
  field: "name" | "date" | "size" | "type" | "accessCount";
  direction: "asc" | "desc";
}

const DEFAULT_MAX_FILES = 20;
const STORAGE_KEY = "recent-files";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const FILE_ICONS = {
  "audio": FileAudio,
  "video": FileVideo,
  "image": FileImage,
  "document": FileTextIcon,
  "default": File
};

const SORT_OPTIONS = [
  { field: "date", label: "Last Accessed", icon: Clock },
  { field: "name", label: "Name", icon: File },
  { field: "size", label: "Size", icon: TrendingUp },
  { field: "type", label: "Type", icon: Tag },
  { field: "accessCount", label: "Frequency", icon: Activity }
];

const FILTER_TYPES = [
  { value: "audio", label: "Audio", icon: Music },
  { value: "video", label: "Video", icon: Video },
  { value: "image", label: "Images", icon: Image },
  { value: "document", label: "Documents", icon: FileText },
  { value: "all", label: "All", icon: File }
];

export default function RecentFiles({
  onFileSelect,
  maxFiles = DEFAULT_MAX_FILES,
  mobileOptimized = true,
  showSearch = true,
  showFilters = true,
  showSortOptions = true,
  viewMode = "grid",
  allowSelection = false,
  allowFavorites = true,
  allowOffline = true,
  allowedTypes,
  autoRefresh = false,
  refreshInterval = 30000
}: RecentFilesProps) {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<RecentFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(viewMode);
  const [currentSort, setCurrentSort] = useState<FileSort>({ field: "date", direction: "desc" });
  const [currentFilter, setCurrentFilter] = useState<FileFilter>({
    type: allowedTypes || [],
    tags: [],
    dateRange: {},
    sizeRange: {},
    favorites: false,
    offline: false
  });
  const [showFilters, setShowFilters] = useState(showFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { triggerHaptic } = useHapticFeedback();
  const { isOnline } = useNetworkStatus();
  const { getFromCache, setInCache, clearCache } = useFileCache();
  const [storedFiles, setStoredFiles] = useLocalStorage<RecentFile[]>(STORAGE_KEY, []);

  // Load recent files from storage and cache
  useEffect(() => {
    loadRecentFiles();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshRecentFiles();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...recentFiles];

    // Apply type filter
    if (currentFilter.type.length > 0 && !currentFilter.type.includes("all")) {
      filtered = filtered.filter(file =>
        currentFilter.type.some(type => file.type.includes(type))
      );
    }

    // Apply tags filter
    if (currentFilter.tags.length > 0) {
      filtered = filtered.filter(file =>
        currentFilter.tags.some(tag => file.tags.includes(tag))
      );
    }

    // Apply date filter
    if (currentFilter.dateRange.start) {
      filtered = filtered.filter(file =>
        file.lastAccessed >= currentFilter.dateRange.start!
      );
    }
    if (currentFilter.dateRange.end) {
      filtered = filtered.filter(file =>
        file.lastAccessed <= currentFilter.dateRange.end!
      );
    }

    // Apply size filter
    if (currentFilter.sizeRange.min !== undefined) {
      filtered = filtered.filter(file => file.size >= currentFilter.sizeRange.min!);
    }
    if (currentFilter.sizeRange.max !== undefined) {
      filtered = filtered.filter(file => file.size <= currentFilter.sizeRange.max!);
    }

    // Apply favorites filter
    if (currentFilter.favorites) {
      filtered = filtered.filter(file => file.isFavorite);
    }

    // Apply offline filter
    if (currentFilter.offline) {
      filtered = filtered.filter(file => file.isOffline);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.tags.some(tag => tag.toLowerCase().includes(query)) ||
        file.type.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[currentSort.field];
      const bValue = b[currentSort.field];

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return currentSort.direction === "desc" ? -comparison : comparison;
    });

    // Limit to maxFiles
    filtered = filtered.slice(0, maxFiles);
    setFilteredFiles(filtered);
  }, [recentFiles, currentFilter, searchQuery, currentSort, maxFiles]);

  // Load recent files
  const loadRecentFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to load from cache first
      const cachedFiles = getFromCache("recent-files");
      if (cachedFiles) {
        setRecentFiles(cachedFiles);
      } else {
        // Load from local storage
        setRecentFiles(storedFiles || []);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading recent files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getFromCache, storedFiles]);

  // Refresh recent files
  const refreshRecentFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Refresh from database or API
      // This would typically fetch from your backend
      const freshFiles = storedFiles || [];
      setRecentFiles(freshFiles);
      setInCache("recent-files", freshFiles);
      setLastRefresh(new Date());
      triggerHaptic("light");
    } catch (error) {
      console.error("Error refreshing recent files:", error);
      triggerHaptic("error");
    } finally {
      setIsLoading(false);
    }
  }, [storedFiles, setInCache, triggerHaptic]);

  // Add file to recent files
  const addRecentFile = useCallback((file: File | FileRow, source: RecentFile["source"] = "upload") => {
    const recentFile: RecentFile = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      lastAccessed: new Date(),
      accessCount: 1,
      isFavorite: false,
      isOffline: false,
      isCloudFile: false,
      tags: [],
      source
    };

    // Check if file already exists
    const existingIndex = recentFiles.findIndex(f => f.name === file.name && f.size === file.size);

    let updatedFiles: RecentFile[];
    if (existingIndex >= 0) {
      // Update existing file
      updatedFiles = [...recentFiles];
      updatedFiles[existingIndex] = {
        ...updatedFiles[existingIndex],
        lastAccessed: new Date(),
        accessCount: updatedFiles[existingIndex].accessCount + 1
      };
    } else {
      // Add new file to beginning
      updatedFiles = [recentFile, ...recentFiles];
    }

    // Limit to max files
    updatedFiles = updatedFiles.slice(0, maxFiles * 2); // Keep more in storage than displayed

    setRecentFiles(updatedFiles);
    setStoredFiles(updatedFiles);
    setInCache("recent-files", updatedFiles);
  }, [recentFiles, maxFiles, setStoredFiles, setInCache]);

  // Remove file from recent files
  const removeRecentFile = useCallback((fileId: string) => {
    const updatedFiles = recentFiles.filter(f => f.id !== fileId);
    setRecentFiles(updatedFiles);
    setStoredFiles(updatedFiles);
    setInCache("recent-files", updatedFiles);
    triggerHaptic("medium");
  }, [recentFiles, setStoredFiles, setInCache, triggerHaptic]);

  // Toggle favorite
  const toggleFavorite = useCallback((fileId: string) => {
    const updatedFiles = recentFiles.map(f =>
      f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f
    );
    setRecentFiles(updatedFiles);
    setStoredFiles(updatedFiles);
    setInCache("recent-files", updatedFiles);
    triggerHaptic("light");
  }, [recentFiles, setStoredFiles, setInCache, triggerHaptic]);

  // Toggle offline availability
  const toggleOffline = useCallback((fileId: string) => {
    const updatedFiles = recentFiles.map(f =>
      f.id === fileId ? { ...f, isOffline: !f.isOffline } : f
    );
    setRecentFiles(updatedFiles);
    setStoredFiles(updatedFiles);
    setInCache("recent-files", updatedFiles);
    triggerHaptic("light");
  }, [recentFiles, setStoredFiles, setInCache, triggerHaptic]);

  // Handle file selection
  const handleFileSelect = useCallback((file: RecentFile) => {
    if (allowSelection) {
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id);
      } else {
        newSelection.add(file.id);
      }
      setSelectedFiles(newSelection);
    } else {
      // Single selection mode
      if (onFileSelect && file.blob) {
        const fileObj = new File([file.blob], file.name, { type: file.type });
        onFileSelect([fileObj]);
        triggerHaptic("success");
      }
    }
  }, [allowSelection, selectedFiles, onFileSelect, triggerHaptic]);

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith("audio/")) return FILE_ICONS.audio;
    if (type.startsWith("video/")) return FILE_ICONS.video;
    if (type.startsWith("image/")) return FILE_ICONS.image;
    if (type.includes("document") || type.includes("pdf")) return FILE_ICONS.document;
    return FILE_ICONS.default;
  };

  // Render file card
  const renderFileCard = (file: RecentFile) => {
    const Icon = getFileIcon(file.type);
    const isSelected = selectedFiles.has(file.id);

    return (
      <Card
        key={file.id}
        className={`group cursor-pointer transition-all hover:shadow-md ${
          isSelected ? "ring-2 ring-blue-500" : ""
        } ${mobileOptimized ? "touch-manipulation" : ""}`}
        onClick={() => handleFileSelect(file)}
      >
        <CardContent className="p-0">
          <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
            {file.thumbnail ? (
              <img
                src={file.thumbnail}
                alt={file.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {/* Overlays */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-1">
                {allowFavorites && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(file.id);
                    }}
                    className="w-8 h-8 p-0"
                  >
                    <Heart className={`w-4 h-4 ${file.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                )}
                {allowOffline && isOnline && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOffline(file.id);
                    }}
                    className="w-8 h-8 p-0"
                  >
                    {file.isOffline ? (
                      <CloudDownload className="w-4 h-4" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentFile(file.id);
                  }}
                  className="w-8 h-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status indicators */}
            <div className="absolute top-2 left-2 flex gap-1">
              {file.isFavorite && (
                <Badge variant="secondary" className="w-6 h-6 p-0 rounded-full">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                </Badge>
              )}
              {file.isOffline && (
                <Badge variant="secondary" className="w-6 h-6 p-0 rounded-full">
                  <Lock className="w-3 h-3" />
                </Badge>
              )}
              {file.isCloudFile && (
                <Badge variant="secondary" className="w-6 h-6 p-0 rounded-full">
                  <Cloud className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </div>

          <div className="p-3">
            <div className="space-y-1">
              <div className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </span>
                <span className="text-xs text-gray-400">
                  {file.accessCount > 1 && `${file.accessCount}x`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render list item
  const renderListItem = (file: RecentFile) => {
    const Icon = getFileIcon(file.type);
    const isSelected = selectedFiles.has(file.id);

    return (
      <Card
        key={file.id}
        className={`group cursor-pointer transition-colors hover:bg-gray-50 ${
          isSelected ? "ring-2 ring-blue-500" : ""
        } ${mobileOptimized ? "touch-manipulation" : ""}`}
        onClick={() => handleFileSelect(file)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Selection checkbox */}
            {allowSelection && (
              <div
                className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect(file);
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-blue-500" />}
              </div>
            )}

            {/* File icon */}
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Icon className="w-6 h-6 text-gray-400" />
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type}
                  </div>
                </div>
              </div>

              {/* Tags and metadata */}
              <div className="flex items-center gap-2 mt-1">
                {file.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {file.isFavorite && (
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                )}
                {file.isOffline && (
                  <Lock className="w-3 h-3 text-gray-500" />
                )}
                {file.accessCount > 1 && (
                  <span className="text-xs text-gray-400">
                    {file.accessCount}x accessed
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {allowFavorites && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(file.id);
                  }}
                  className="w-8 h-8 p-0"
                >
                  <Heart className={`w-4 h-4 ${file.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => removeRecentFile(file.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                  {allowOffline && isOnline && (
                    <DropdownMenuItem onClick={() => toggleOffline(file.id)}>
                      {file.isOffline ? (
                        <>
                          <Cloud className="w-4 h-4 mr-2" />
                          Remove Offline
                        </>
                      ) : (
                        <>
                          <CloudDownload className="w-4 h-4 mr-2" />
                          Make Available Offline
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`recent-files ${mobileOptimized ? "mobile-optimized" : ""}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent Files</h2>
            <p className="text-sm text-gray-500">
              {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <Badge variant="outline" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Auto-refresh
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshRecentFiles}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search recent files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filters and Sort */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            )}

            {showSortOptions && (
              <Select
                value={`${currentSort.field}-${currentSort.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split("-") as [FileSort["field"], FileSort["direction"]];
                  setCurrentSort({ field, direction });
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(({ field, label, icon: Icon }) => (
                    <SelectItem key={`${field}-asc`} value={`${field}-asc`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label} (A-Z)
                      </div>
                    </SelectItem>
                    <SelectItem key={`${field}-desc`} value={`${field}-desc`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label} (Z-A)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Type Filter */}
              <div>
                <Label className="text-sm font-medium">File Type</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FILTER_TYPES.map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={currentFilter.type.includes(value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (value === "all") {
                          setCurrentFilter(prev => ({ ...prev, type: [] }));
                        } else {
                          setCurrentFilter(prev => ({
                            ...prev,
                            type: prev.type.includes(value)
                              ? prev.type.filter(t => t !== value)
                              : [...prev.type, value]
                          }));
                        }
                      }}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="favorites"
                    checked={currentFilter.favorites}
                    onCheckedChange={(checked) =>
                      setCurrentFilter(prev => ({ ...prev, favorites: checked }))
                    }
                  />
                  <Label htmlFor="favorites">Favorites only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="offline"
                    checked={currentFilter.offline}
                    onCheckedChange={(checked) =>
                      setCurrentFilter(prev => ({ ...prev, offline: checked }))
                    }
                  />
                  <Label htmlFor="offline">Offline available</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-500">Loading recent files...</p>
          </div>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
          {filteredFiles.map(renderFileCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent files</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || currentFilter.type.length > 0 || currentFilter.favorites
                ? "No files match your filters. Try adjusting your search or filter criteria."
                : "Files you upload or create will appear here for quick access."}
            </p>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        .recent-files.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .recent-files button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
