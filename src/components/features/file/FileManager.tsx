/**
 * 简化的文件管理器组件
 * 使用统一的文件状态管理系统
 */

"use client";

import { Grid, List, Search } from "lucide-react";
import React, { useCallback, useState } from "react";
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
import { useFiles } from "@/hooks";
import { useFileStatus, useFileStatusManager } from "@/hooks/useFileStatus";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import FileCard from "./FileCard";
import FileUpload from "./FileUpload";

interface FileManagerProps {
  className?: string;
}

export default function FileManager({ className }: FileManagerProps) {
  // 基础状态
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [filterBy, setFilterBy] = useState<"all" | "transcribed" | "untranscribed">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Hooks
  const { files, addFiles, deleteFile } = useFiles();

  // 统一文件ID处理为字符串
  const handleDeleteFile = useCallback(
    (fileId: number) => {
      deleteFile(fileId.toString());
    },
    [deleteFile],
  );

  // 处理播放
  const handlePlayFile = useCallback((fileId: number) => {
    window.location.href = `/player/${fileId}`;
  }, []);

  // 处理文件上传
  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      try {
        setIsUploading(true);
        setUploadProgress(0);

        console.log("📁 开始上传文件:", {
          selectedFiles: selectedFiles.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
          count: selectedFiles.length,
        });

        // 检查文件数量限制
        const currentFileCount = files?.length || 0;
        const maxFiles = 5;
        const remainingSlots = maxFiles - currentFileCount;

        if (remainingSlots <= 0) {
          const { toast } = await import("sonner");
          toast.error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
          setIsUploading(false);
          return;
        }

        // 如果选择的文件超过剩余槽位，只取前面的文件
        const filesToAdd = selectedFiles.slice(0, remainingSlots);
        if (filesToAdd.length < selectedFiles.length) {
          const { toast } = await import("sonner");
          toast.warning(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);
        }

        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        await addFiles(filesToAdd);

        clearInterval(progressInterval);
        setUploadProgress(100);

        const { toast } = await import("sonner");
        toast.success(`成功上传 ${filesToAdd.length} 个文件`);

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);

        console.log("✅ 文件上传成功");
      } catch (error) {
        console.error("❌ 文件上传失败:", error);
        const { toast } = await import("sonner");
        toast.error(`文件上传失败: ${error instanceof Error ? error.message : "未知错误"}`);
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [addFiles, files?.length],
  );

  // 过滤和排序文件
  const filteredFiles = React.useMemo(() => {
    let filtered = files || [];

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // 状态过滤
    if (filterBy !== "all") {
      filtered = filtered.filter((file) => {
        const status = file.status || FileStatus.UPLOADED;
        if (filterBy === "transcribed") {
          return status === FileStatus.COMPLETED;
        } else if (filterBy === "untranscribed") {
          return status === FileStatus.UPLOADED;
        }
        return true;
      });
    }

    // 排序
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        default:
          return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0);
      }
    });
  }, [files, searchQuery, sortBy, filterBy]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 文件上传区域 */}
      <div className="mb-8">
        <FileUpload
          onFilesSelected={handleFilesSelected}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          currentFileCount={files?.length || 0}
          maxFiles={5}
        />
      </div>

      {/* 搜索和过滤器 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 过滤器 */}
        <Select
          value={filterBy}
          onValueChange={(value: "all" | "transcribed" | "untranscribed") => setFilterBy(value)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="状态过滤" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部文件</SelectItem>
            <SelectItem value="transcribed">已转录</SelectItem>
            <SelectItem value="untranscribed">未转录</SelectItem>
          </SelectContent>
        </Select>

        {/* 排序 */}
        <Select
          value={sortBy}
          onValueChange={(value: "name" | "date" | "size") => setSortBy(value)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">按日期</SelectItem>
            <SelectItem value="name">按名称</SelectItem>
            <SelectItem value="size">按大小</SelectItem>
          </SelectContent>
        </Select>

        {/* 视图切换 */}
        <div className="flex border rounded-md">
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            onClick={() => setViewMode("grid")}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="space-y-4">
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "没有找到匹配的文件" : "还没有上传任何文件"}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery ? "尝试调整搜索条件或过滤器" : "上传音频文件开始使用转录功能"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            }
          >
            {filteredFiles.map((file) => (
              <FileCardWrapper
                key={file.id}
                file={file}
                onPlay={handlePlayFile}
                onDelete={handleDeleteFile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 文件卡片包装器，负责状态管理
 */
function FileCardWrapper({
  file,
  onPlay,
  onDelete,
}: {
  file: FileRow;
  onPlay: (fileId: number) => void;
  onDelete: (fileId: number) => void;
}) {
  // Hooks must be called before any early returns
  const { data: statusData, isLoading } = useFileStatus(file.id);
  const { startTranscription, isTranscribing } = useFileStatusManager(file.id);

  // 优雅地处理可能缺失的 file.id
  if (!file.id) {
    console.warn("FileCardWrapper: file.id is missing", file);
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">文件信息不完整</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !statusData) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 合并文件信息
  const fileWithStatus = {
    ...file,
    status: statusData.status,
  };

  return (
    <FileCard
      file={fileWithStatus}
      onPlay={onPlay}
      onDelete={onDelete}
      onTranscribe={startTranscription}
      transcriptionProgress={isTranscribing ? 50 : undefined} // 简化的进度显示
    />
  );
}
