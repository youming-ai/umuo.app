/**
 * Mobile File Management Usage Example
 * Demonstrates how to integrate and use the mobile file management system
 */

"use client";

import React from "react";
import MobileFileManager, {
  useMobileFiles,
  useMobileFileSelection,
  useAccessibility,
} from "@/components/features/file-management";

export default function MobileFileManagementExample() {
  // File filtering state
  const [filters, setFilters] = React.useState({
    status: "all" as const,
    fileType: "all" as const,
    dateRange: "all" as const,
    maxSize: undefined,
  });

  const [sortBy, setSortBy] = React.useState<"date" | "name" | "size" | "duration">("date");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Mobile-optimized hooks
  const { data: files, isLoading, error } = useMobileFiles(filters, sortBy, searchQuery);
  const { selectFile, selectAllFiles, clearSelection } = useMobileFileSelection();
  const { announce, prefersReducedMotion } = useAccessibility();

  // Handle file selection
  const handleFileSelect = React.useCallback((fileId: number) => {
    // Navigate to player page
    window.location.href = `/player/${fileId}`;
    announce(`正在打开文件 ${fileId}`);
  }, [announce]);

  // Handle search with debouncing
  const debouncedSearch = React.useMemo(
    () => debounce((query: string) => {
      setSearchQuery(query);
      if (query) {
        announce(`搜索 ${query}`);
      }
    }, 300),
    [announce]
  );

  // Handle filter changes
  const handleFilterChange = React.useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    announce("过滤器已更新");
  }, [announce]);

  // Handle bulk operations
  const handleBulkOperation = React.useCallback((operation: string, count: number) => {
    announce(`正在对 ${count} 个文件执行${operation}操作`);
  }, [announce]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">加载文件中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-500 mb-2">❌</div>
        <h3 className="text-lg font-semibold mb-1">加载失败</h3>
        <p className="text-muted-foreground text-sm">
          {error.message || "无法加载文件列表"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile File Manager */}
      <MobileFileManager
        onFileSelect={handleFileSelect}
        allowMultiSelect={true}
        showUploadButton={true}
        className="flex-1"
      />
    </div>
  );
}

/**
 * Utility function for debouncing search input
 */
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Example of using the mobile file management in a page
 */
export function MobileFilePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold">文件管理</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <MobileFileManagementExample />
      </main>
    </div>
  );
}

/**
 * Example of advanced usage with custom accessibility labels
 */
export function AdvancedMobileFileManager() {
  const customLabels = {
    fileCard: {
      select: "选择此文件进行操作",
      play: "播放音频并开始学习",
      delete: "永久删除此文件",
      share: "分享文件链接给朋友",
      download: "下载文件到本地",
      preview: "预览文件详情",
      transcriptionStatus: "转录进度状态",
      fileSize: "文件大小信息",
      uploadDate: "文件上传时间",
    },
    bulkOperations: {
      select: "批量选择文件",
      delete: "批量删除选中的文件",
      transcribe: "批量转录选中的文件",
      download: "批量下载选中的文件",
      share: "批量分享选中的文件",
      clearSelection: "取消所有选择",
    },
    search: {
      search: "输入文件名进行搜索",
      filter: "按条件过滤文件",
      sort: "按指定方式排序文件",
      clearFilters: "清除所有搜索和过滤条件",
    },
  };

  const accessibility = useAccessibility(customLabels);

  return (
    <MobileFileManager
      onFileSelect={(fileId) => {
        accessibility.announce(`正在打开文件 ${fileId}`);
        window.location.href = `/player/${fileId}`;
      }}
      allowMultiSelect={true}
      showUploadButton={true}
    />
  );
}

/**
 * Example of integrating with existing routes
 */
export function MobileFileManagerRoute() {
  // This would be used in a Next.js page component
  return (
    <div className="h-screen flex flex-col">
      <MobileFileManagementExample />
    </div>
  );
}
