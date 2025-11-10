/**
 * Type definitions for mobile file management components
 */

import type { FileRow } from "@/types/db/database";

export type FilterOptions = {
  status: "all" | "transcribed" | "untranscribed" | "transcribing" | "error";
  fileType: "all" | "audio" | "video";
  dateRange: "all" | "today" | "week" | "month" | "year";
  maxSize?: number; // in bytes
  tags?: string[];
};

export type SortOptions = "date" | "name" | "size" | "duration";

export type ViewMode = "grid" | "list";

export type FileWithStatus = FileRow & {
  transcriptionStatus?: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
};

export type BulkOperation = "delete" | "download" | "share" | "transcribe";

export type FileAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive" | "outline";
  action: () => void;
  disabled?: boolean;
};

export type SwipeAction = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
  threshold?: number;
};

// Default filter values
export const defaultFilters: FilterOptions = {
  status: "all",
  fileType: "all",
  dateRange: "all",
  maxSize: undefined,
  tags: [],
};

// File size presets
export const fileSizePresets = [
  { label: "任意大小", value: undefined },
  { label: "小于 10MB", value: 10 * 1024 * 1024 },
  { label: "小于 50MB", value: 50 * 1024 * 1024 },
  { label: "小于 100MB", value: 100 * 1024 * 1024 },
  { label: "小于 500MB", value: 500 * 1024 * 1024 },
];

// File type options
export const fileTypeOptions = [
  { label: "全部文件", value: "all" },
  { label: "音频文件", value: "audio" },
  { label: "视频文件", value: "video" },
];

// Status options
export const statusOptions = [
  { label: "全部状态", value: "all" },
  { label: "已转录", value: "transcribed" },
  { label: "未转录", value: "untranscribed" },
  { label: "转录中", value: "transcribing" },
  { label: "转录失败", value: "error" },
];

// Date range options
export const dateRangeOptions = [
  { label: "任意时间", value: "all" },
  { label: "今天", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "今年", value: "year" },
];

// Sort options
export const sortOptions = [
  { label: "按日期", value: "date" },
  { label: "按名称", value: "name" },
  { label: "按大小", value: "size" },
  { label: "按时长", value: "duration" },
];
