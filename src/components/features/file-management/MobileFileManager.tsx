/**
 * Mobile File Manager - Touch-optimized file management interface
 * Provides comprehensive file management with search, filtering, bulk operations
 * and gesture support for mobile devices
 */

"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Search, Filter, Grid, List, Download, Trash2, Share2, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useFiles } from "@/hooks";
import { useFileStatus, useBatchFileStatus } from "@/hooks/useFileStatus";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useToast } from "@/hooks/use-toast";

import MobileFileGrid from "./MobileFileGrid";
import MobileFileCard from "./MobileFileCard";
import FileSearch from "./FileSearch";
import BulkOperations from "./BulkOperations";
import FilePreview from "./FilePreview";
import { type FilterOptions, type SortOptions, defaultFilters } from "./types";

interface MobileFileManagerProps {
  className?: string;
  onFileSelect?: (fileId: number) => void;
  allowMultiSelect?: boolean;
  showUploadButton?: boolean;
}

export default function MobileFileManager({
  className,
  onFileSelect,
  allowMultiSelect = true,
  showUploadButton = true,
}: MobileFileManagerProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortOptions>("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const mobileFileGridRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { files, deleteFile } = useFiles();
  const { startBatchTranscription } = useBatchFileStatus();
  const { toast } = useToast();

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let filtered = files || [];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((file) => {
        const status = file.status || FileStatus.UPLOADED;
        switch (filters.status) {
          case "transcribed":
            return status === FileStatus.COMPLETED;
          case "untranscribed":
            return status === FileStatus.UPLOADED;
          case "transcribing":
            return status === FileStatus.TRANSCRIBING;
          case "error":
            return status === FileStatus.ERROR;
          default:
            return true;
        }
      });
    }

    // Apply file type filter
    if (filters.fileType !== "all") {
      filtered = filtered.filter((file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (filters.fileType) {
          case "audio":
            return ["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(extension || "");
          case "video":
            return ["mp4", "mov", "avi", "mkv", "webm"].includes(extension || "");
          default:
            return true;
        }
      });
    }

    // Apply size filter
    if (filters.maxSize) {
      filtered = filtered.filter((file) => (file.size || 0) <= filters.maxSize!);
    }

    // Apply date filter
    if (filters.dateRange) {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }

      if (filters.dateRange !== "all") {
        filtered = filtered.filter((file) =>
          file.uploadedAt && file.uploadedAt >= filterDate
        );
      }
    }

    // Sort files
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        case "date":
        default:
          return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0);
      }
    });
  }, [files, searchQuery, filters, sortBy]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: number) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  // Select all files
  const selectAllFiles = useCallback(() => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((file) => file.id!)));
    }
  }, [selectedFiles.size, filteredFiles]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setIsBulkMode(false);
  }, []);

  // Handle file deletion
  const handleDeleteFile = useCallback(
    async (fileId: number) => {
      try {
        await deleteFile(fileId.toString());
        toast({
          title: "文件已删除",
          description: "文件已被成功删除",
        });
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      } catch (error) {
        toast({
          title: "删除失败",
          description: error instanceof Error ? error.message : "删除文件时发生错误",
          variant: "destructive",
        });
      }
    },
    [deleteFile, toast]
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    try {
      const promises = Array.from(selectedFiles).map((fileId) =>
        deleteFile(fileId.toString())
      );
      await Promise.all(promises);

      toast({
        title: "批量删除完成",
        description: `已删除 ${selectedFiles.size} 个文件`,
      });

      clearSelection();
    } catch (error) {
      toast({
        title: "批量删除失败",
        description: error instanceof Error ? error.message : "删除文件时发生错误",
        variant: "destructive",
      });
    }
  }, [selectedFiles, deleteFile, toast, clearSelection]);

  // Handle bulk transcription
  const handleBulkTranscribe = useCallback(async () => {
    try {
      const results = await startBatchTranscription(Array.from(selectedFiles));
      const successCount = results.filter((r) => r.status === "fulfilled" && r.value?.success).length;

      toast({
        title: "批量转录已开始",
        description: `已开始转录 ${successCount} 个文件`,
      });

      clearSelection();
    } catch (error) {
      toast({
        title: "批量转录失败",
        description: error instanceof Error ? error.message : "启动批量转录时发生错误",
        variant: "destructive",
      });
    }
  }, [selectedFiles, startBatchTranscription, toast, clearSelection]);

  // Handle file preview
  const handlePreviewFile = useCallback((file: FileRow) => {
    setPreviewFile(file);
  }, []);

  // Close preview
  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  // Toggle bulk mode
  const toggleBulkMode = useCallback(() => {
    setIsBulkMode((prev) => !prev);
    if (!isBulkMode) {
      setSelectedFiles(new Set());
    }
  }, [isBulkMode]);

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header with search and actions */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-20 h-12 touch-manipulation"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="h-8 w-8 p-0 touch-manipulation"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="h-8 w-8 p-0 touch-manipulation"
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Bulk mode controls */}
          {isBulkMode && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiles}
                  className="touch-manipulation"
                >
                  {selectedFiles.size === filteredFiles.length ? "取消全选" : "全选"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedFiles.size} 个文件
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBulkMode}
                className="touch-manipulation"
              >
                取消
              </Button>
            </div>
          )}

          {/* Bulk operations toolbar */}
          {isBulkMode && selectedFiles.size > 0 && (
            <BulkOperations
              selectedFiles={selectedFiles}
              onDelete={handleBulkDelete}
              onTranscribe={handleBulkTranscribe}
              onShare={() => {
                toast({
                  title: "分享功能",
                  description: "分享功能即将推出",
                });
              }}
              onDownload={() => {
                toast({
                  title: "下载功能",
                  description: "下载功能即将推出",
                });
              }}
            />
          )}
        </div>
      </div>

      {/* File list */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2 text-center">
              {searchQuery ? "没有找到匹配的文件" : "还没有上传任何文件"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "尝试调整搜索条件或过滤器"
                : "上传音频文件开始使用转录功能"}
            </p>
          </div>
        ) : (
          <MobileFileGrid
            ref={mobileFileGridRef}
            files={filteredFiles}
            viewMode={viewMode}
            selectedFiles={selectedFiles}
            isBulkMode={isBulkMode}
            onFileSelect={onFileSelect}
            onFilePreview={handlePreviewFile}
            onFileDelete={handleDeleteFile}
            onToggleSelection={toggleFileSelection}
            onToggleBulkMode={toggleBulkMode}
            className="p-4"
          />
        )}
      </div>

      {/* Floating action buttons */}
      {!isBulkMode && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-20">
          {allowMultiSelect && (
            <Button
              size="lg"
              onClick={toggleBulkMode}
              className="h-14 w-14 rounded-full shadow-lg touch-manipulation"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}

      {/* Filters sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>文件过滤器</SheetTitle>
          </SheetHeader>
          <FileSearch
            filters={filters}
            sortBy={sortBy}
            onFiltersChange={setFilters}
            onSortChange={setSortBy}
          />
        </SheetContent>
      </Sheet>

      {/* File preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={closePreview}
          onPlay={() => onFileSelect?.(previewFile.id!)}
        />
      )}
    </div>
  );
}
