/**
 * 简化版文件管理器组件
 * 使用现有的转录系统集成
 */

"use client";

import { Grid, List, Search } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/ui/Navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiles } from "@/hooks";
import FileCard from "./FileCard";
import FileUpload from "./FileUpload";
import StatsCards from "./StatsCards";

export default function FileManager() {
  // 基础状态
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [filterBy, setFilterBy] = useState<"all" | "transcribed" | "untranscribed">("all");

  // Hooks
  const { files, addFiles, deleteFile } = useFiles();

  // 过滤和排序文件
  const filteredFiles = React.useMemo(() => {
    let filtered = files || [];

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // 排序
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        default:
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      }
    });
  }, [files, searchQuery, sortBy]);

  // 处理文件上传
  const handleFilesSelected = async (selectedFiles: File[]) => {
    try {
      await addFiles(selectedFiles);

      // 显示成功提示
      const { toast } = await import("sonner");
      toast.success(`成功上传 ${selectedFiles.length} 个文件`);
    } catch (_error) {
      const { toast } = await import("sonner");
      toast.error("文件上传失败");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 mt-20">
        {/* 页面标题 */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">文件管理</h1>
              <p className="text-muted-foreground">管理您的音频文件和转录任务</p>
            </div>
          </div>

          {/* 统计卡片 */}
          <StatsCards />
        </div>

        {/* 文件上传区域 */}
        <div className="mb-8">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            isUploading={false}
            uploadProgress={0}
          />
        </div>

        {/* 文件列表和控制 */}
        <div className="space-y-6">
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
                  {!searchQuery && (
                    <FileUpload
                      onFilesSelected={handleFilesSelected}
                      isUploading={false}
                      uploadProgress={0}
                    />
                  )}
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
                  <FileCard
                    key={file.id}
                    file={file}
                    onPlay={(fileId) => {
                      // 导航到播放器页面
                      window.location.href = `/player/${fileId}`;
                    }}
                    onDelete={deleteFile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
