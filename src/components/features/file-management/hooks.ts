/**
 * Mobile File Management Hooks - TanStack Query integration
 * Provides optimized state management for mobile file operations
 */

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { db } from "@/lib/db/db";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import type {
  FilterOptions,
  SortOptions,
} from "@/components/features/file-management/types";

// Query keys for file management
export const mobileFileKeys = {
  all: ["mobileFiles"] as const,
  filtered: (filters: FilterOptions, sortBy: SortOptions, search: string) =>
    [...mobileFileKeys.all, "filtered", filters, sortBy, search] as const,
  file: (id: number) => [...mobileFileKeys.all, "file", id] as const,
  bulkOperations: ["bulkOperations"] as const,
};

// Enhanced file filtering with mobile optimizations
export function useMobileFiles(
  filters: FilterOptions,
  sortBy: SortOptions,
  searchQuery: string,
) {
  return useQuery({
    queryKey: mobileFileKeys.filtered(filters, sortBy, searchQuery),
    queryFn: async () => {
      // Get all files from IndexedDB
      const files = await db.files.toArray();

      // Apply filters
      let filteredFiles = files.filter((file) => {
        // Search filter
        if (
          searchQuery &&
          !file.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        if (filters.status !== "all") {
          const fileStatus = file.status || FileStatus.UPLOADED;
          switch (filters.status) {
            case "transcribed":
              return fileStatus === FileStatus.COMPLETED;
            case "untranscribed":
              return fileStatus === FileStatus.UPLOADED;
            case "transcribing":
              return fileStatus === FileStatus.TRANSCRIBING;
            case "error":
              return fileStatus === FileStatus.ERROR;
            default:
              return true;
          }
        }

        // File type filter
        if (filters.fileType !== "all") {
          const extension = file.name.split(".").pop()?.toLowerCase();
          const audioExtensions = ["mp3", "wav", "m4a", "aac", "flac", "ogg"];
          const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm"];

          switch (filters.fileType) {
            case "audio":
              return audioExtensions.includes(extension || "");
            case "video":
              return videoExtensions.includes(extension || "");
            default:
              return true;
          }
        }

        // Size filter
        if (filters.maxSize && (file.size || 0) > filters.maxSize) {
          return false;
        }

        // Date filter
        if (filters.dateRange !== "all" && file.uploadedAt) {
          const now = new Date();
          const fileDate = new Date(file.uploadedAt);

          switch (filters.dateRange) {
            case "today":
              return fileDate.toDateString() === now.toDateString();
            case "week":
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return fileDate >= weekAgo;
            case "month":
              const monthAgo = new Date(
                now.getTime() - 30 * 24 * 60 * 60 * 1000,
              );
              return fileDate >= monthAgo;
            case "year":
              const yearAgo = new Date(
                now.getTime() - 365 * 24 * 60 * 60 * 1000,
              );
              return fileDate >= yearAgo;
            default:
              return true;
          }
        }

        return true;
      });

      // Sort files
      return filteredFiles.sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "size":
            return (b.size || 0) - (a.size || 0);
          case "date":
          default:
            return (
              (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0)
            );
        }
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// File deletion mutation with mobile optimizations
export function useMobileFileDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: number[]) => {
      // Delete files from IndexedDB
      await Promise.all(
        fileIds.map(async (fileId) => {
          await db.files.delete(fileId);
          // Also delete related transcripts and segments
          const transcripts = await db.transcripts
            .where("fileId")
            .equals(fileId)
            .toArray();
          for (const transcript of transcripts) {
            await db.segments
              .where("transcriptId")
              .equals(transcript.id!)
              .delete();
            await db.transcripts.delete(transcript.id!);
          }
        }),
      );

      return fileIds;
    },
    onSuccess: (deletedIds) => {
      // Invalidate file queries
      queryClient.invalidateQueries({ queryKey: mobileFileKeys.all });

      // Invalidate specific file queries
      deletedIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: mobileFileKeys.file(id) });
      });
    },
    onError: (error) => {
      console.error("Failed to delete files:", error);
    },
  });
}

// Bulk file operations with progress tracking
export function useMobileBulkOperations() {
  const queryClient = useQueryClient();

  const bulkDelete = useMutation({
    mutationFn: async ({
      fileIds,
      onProgress,
    }: {
      fileIds: number[];
      onProgress?: (current: number, total: number) => void;
    }) => {
      const total = fileIds.length;

      for (let i = 0; i < total; i++) {
        const fileId = fileIds[i];

        // Delete file and related data
        await db.files.delete(fileId);
        const transcripts = await db.transcripts
          .where("fileId")
          .equals(fileId)
          .toArray();
        for (const transcript of transcripts) {
          await db.segments
            .where("transcriptId")
            .equals(transcript.id!)
            .delete();
          await db.transcripts.delete(transcript.id!);
        }

        // Report progress
        onProgress?.(i + 1, total);

        // Small delay to prevent UI blocking
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      return { deletedCount: total };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileFileKeys.all });
    },
  });

  const bulkTranscribe = useMutation({
    mutationFn: async ({
      fileIds,
      onProgress,
    }: {
      fileIds: number[];
      onProgress?: (current: number, total: number, message: string) => void;
    }) => {
      const total = fileIds.length;

      for (let i = 0; i < total; i++) {
        const fileId = fileIds[i];

        // Update file status to transcribing
        await db.files.update(fileId, { status: FileStatus.TRANSCRIBING });
        onProgress?.(i + 1, total, `开始转录文件 ${i + 1}/${total}`);

        // Start transcription via API
        const response = await fetch(
          `/api/transcribe?fileId=${fileId}&language=ja`,
          {
            method: "POST",
            body: await createFormData(fileId),
          },
        );

        if (!response.ok) {
          throw new Error(`转录失败: ${response.statusText}`);
        }

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { startedCount: total };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileFileKeys.all });
    },
  });

  return {
    bulkDelete,
    bulkTranscribe,
  };
}

// File selection state management
export function useMobileFileSelection() {
  const queryClient = useQueryClient();

  const selectFile = useCallback(
    (fileId: number, isSelected: boolean) => {
      // This could be stored in React state or a separate query
      // For now, we'll use a simple approach with query cache
      const currentSelection =
        queryClient.getQueryData<Set<number>>(mobileFileKeys.bulkOperations) ||
        new Set();

      const newSelection = new Set(currentSelection);

      if (isSelected) {
        newSelection.add(fileId);
      } else {
        newSelection.delete(fileId);
      }

      queryClient.setQueryData(mobileFileKeys.bulkOperations, newSelection);
    },
    [queryClient],
  );

  const selectAllFiles = useCallback(
    (fileIds: number[], isSelected: boolean) => {
      const newSelection = isSelected ? new Set(fileIds) : new Set<number>();
      queryClient.setQueryData(mobileFileKeys.bulkOperations, newSelection);
    },
    [queryClient],
  );

  const clearSelection = useCallback(() => {
    queryClient.setQueryData(mobileFileKeys.bulkOperations, new Set<number>());
  }, [queryClient]);

  return {
    selectFile,
    selectAllFiles,
    clearSelection,
  };
}

// Performance monitoring for mobile operations
export function useMobilePerformance() {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    filterTime: 0,
    memoryUsage: 0,
  });

  const measurePerformance = useCallback(
    (operation: string, fn: () => void) => {
      const startTime = performance.now();

      try {
        fn();
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;

        setMetrics((prev) => ({
          ...prev,
          [`${operation}Time`]: duration,
        }));

        console.log(
          `[Mobile Performance] ${operation}: ${duration.toFixed(2)}ms`,
        );
      }
    },
    [],
  );

  // Get memory usage if available
  React.useEffect(() => {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
      }));
    }
  }, []);

  return {
    metrics,
    measurePerformance,
  };
}

// Helper function to create form data for file upload
async function createFormData(fileId: number): Promise<FormData> {
  const file = await db.files.get(fileId);
  if (!file || !file.blob) {
    throw new Error("文件不存在或数据已损坏");
  }

  const formData = new FormData();
  formData.append("audio", file.blob, file.name);
  formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

  return formData;
}
