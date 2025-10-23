import { useCallback, useMemo, useState } from "react";
import type { FileRow, ProcessingStatus, TranscriptRow } from "@/types/db/database";

interface FileListState {
  selectedFiles: Set<number>;
  searchQuery: string;
  sortBy: "name" | "size" | "duration" | "createdAt";
  sortOrder: "asc" | "desc";
  statusFilter: ProcessingStatus | "all";
}

interface UseFileListProps {
  files: FileRow[];
  transcripts: TranscriptRow[];
}

interface UseFileListReturn {
  // State
  selectedFiles: Set<number>;
  searchQuery: string;
  sortBy: "name" | "size" | "duration" | "createdAt";
  sortOrder: "asc" | "desc";
  statusFilter: ProcessingStatus | "all";

  // Computed values
  filteredAndSortedFiles: FileRow[];
  transcriptStatusMap: Map<number, ProcessingStatus>;

  // Actions
  setSelectedFiles: (files: Set<number>) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: "name" | "size" | "duration" | "createdAt") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setStatusFilter: (filter: ProcessingStatus | "all") => void;
  handleSelectAll: () => void;
  handleSelectFile: (fileId: number) => void;
  handleSort: (field: "name" | "size" | "duration" | "createdAt") => void;
}

export function useFileList({ files, transcripts }: UseFileListProps): UseFileListReturn {
  const [state, setState] = useState<FileListState>({
    selectedFiles: new Set(),
    searchQuery: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    statusFilter: "all",
  });

  // Memoize transcript status lookup for better performance
  const transcriptStatusMap = useMemo(() => {
    const statusMap = new Map<number, ProcessingStatus>();

    files.forEach((file) => {
      if (!file.id) return;

      const fileTranscripts = transcripts.filter((t) => t.fileId === file.id);

      if (fileTranscripts.length === 0) {
        statusMap.set(file.id, "pending");
        return;
      }

      const latestTranscript = fileTranscripts.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest,
      );
      statusMap.set(file.id, latestTranscript.status);
    });

    return statusMap;
  }, [files, transcripts]);

  // 过滤逻辑
  const filterFiles = useCallback(
    (files: FileRow[]) => {
      const { searchQuery, statusFilter } = state;

      return files.filter((file) => {
        // 搜索过滤
        if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // 状态过滤
        if (statusFilter !== "all") {
          const fileStatus = transcriptStatusMap.get(file.id || 0);
          return fileStatus === statusFilter;
        }

        return true;
      });
    },
    [state.searchQuery, state.statusFilter, transcriptStatusMap, state],
  );

  // 获取排序值
  const getSortValue = useCallback((file: FileRow, sortBy: string): string | number => {
    switch (sortBy) {
      case "name":
        return file.name.toLowerCase();
      case "size":
        return file.size;
      case "duration":
        return file.duration || 0;
      case "createdAt":
        return file.createdAt.getTime();
      default:
        return file.createdAt.getTime();
    }
  }, []);

  // 简化的排序比较函数
  const compareValues = useCallback(
    (a: string | number, b: string | number, order: "asc" | "desc") => {
      if (a === b) return 0;

      const comparison = a < b ? -1 : 1;
      return order === "asc" ? comparison : -comparison;
    },
    [],
  );

  // 排序逻辑
  const sortFiles = useCallback(
    (files: FileRow[]) => {
      const { sortBy, sortOrder } = state;
      const filesCopy = [...files]; // 创建副本以避免修改原数组

      filesCopy.sort((a, b) => {
        const aValue = getSortValue(a, sortBy);
        const bValue = getSortValue(b, sortBy);
        return compareValues(aValue, bValue, sortOrder);
      });

      return filesCopy;
    },
    [state.sortBy, state.sortOrder, getSortValue, compareValues, state],
  );

  // 组合过滤和排序
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = filterFiles(files);
    return sortFiles(filtered);
  }, [files, filterFiles, sortFiles]);

  // 状态更新函数
  const setStateField = useCallback(
    <K extends keyof FileListState>(field: K, value: FileListState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // 处理全选
  const handleSelectAll = useCallback(() => {
    setStateField(
      "selectedFiles",
      state.selectedFiles.size === filteredAndSortedFiles.length
        ? new Set()
        : new Set(filteredAndSortedFiles.map((file) => file.id).filter(Boolean) as number[]),
    );
  }, [state.selectedFiles.size, filteredAndSortedFiles, setStateField]);

  // 处理单个文件选择
  const handleSelectFile = useCallback(
    (fileId: number) => {
      const newSet = new Set(state.selectedFiles);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      setStateField("selectedFiles", newSet);
    },
    [state.selectedFiles, setStateField],
  );

  // 处理排序
  const handleSort = useCallback(
    (field: "name" | "size" | "duration" | "createdAt") => {
      if (state.sortBy === field) {
        setStateField("sortOrder", state.sortOrder === "asc" ? "desc" : "asc");
      } else {
        setStateField("sortBy", field);
        setStateField("sortOrder", "desc");
      }
    },
    [state.sortBy, state.sortOrder, setStateField],
  );

  return {
    // State
    selectedFiles: state.selectedFiles,
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    statusFilter: state.statusFilter,

    // Computed values
    filteredAndSortedFiles,
    transcriptStatusMap,

    // Actions
    setSelectedFiles: (files) => setStateField("selectedFiles", files),
    setSearchQuery: (query) => setStateField("searchQuery", query),
    setSortBy: (field) => setStateField("sortBy", field),
    setSortOrder: (order) => setStateField("sortOrder", order),
    setStatusFilter: (filter) => setStateField("statusFilter", filter),
    handleSelectAll,
    handleSelectFile,
    handleSort,
  };
}
