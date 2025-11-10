/**
 * File Search - Mobile-optimized search and filtering interface
 * Provides comprehensive file filtering with touch-friendly controls
 */

"use client";

import React from "react";
import { Calendar, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FilterOptions, SortOptions } from "./types";
import {
  fileSizePresets,
  fileTypeOptions,
  statusOptions,
  dateRangeOptions,
  sortOptions,
} from "./types";

interface FileSearchProps {
  filters: FilterOptions;
  sortBy: SortOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onSortChange: (sortBy: SortOptions) => void;
  className?: string;
}

export default function FileSearch({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange,
  className,
}: FileSearchProps) {
  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      fileType: "all",
      dateRange: "all",
      maxSize: undefined,
      tags: [],
    });
  };

  const hasActiveFilters = filters.status !== "all" ||
    filters.fileType !== "all" ||
    filters.dateRange !== "all" ||
    filters.maxSize !== undefined;

  return (
    <div className={cn("space-y-6 p-4", className)}>
      {/* Quick filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">快速过滤</Label>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              清除
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filters.status === "transcribed" ? "default" : "outline"}
            className="cursor-pointer touch-manipulation"
            onClick={() => updateFilter("status", filters.status === "transcribed" ? "all" : "transcribed")}
          >
            已转录
          </Badge>
          <Badge
            variant={filters.status === "untranscribed" ? "default" : "outline"}
            className="cursor-pointer touch-manipulation"
            onClick={() => updateFilter("status", filters.status === "untranscribed" ? "all" : "untranscribed")}
          >
            未转录
          </Badge>
          <Badge
            variant={filters.fileType === "audio" ? "default" : "outline"}
            className="cursor-pointer touch-manipulation"
            onClick={() => updateFilter("fileType", filters.fileType === "audio" ? "all" : "audio")}
          >
            音频
          </Badge>
          <Badge
            variant={filters.dateRange === "today" ? "default" : "outline"}
            className="cursor-pointer touch-manipulation"
            onClick={() => updateFilter("dateRange", filters.dateRange === "today" ? "all" : "today")}
          >
            今天
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Advanced filters */}
      <Accordion type="multiple" defaultValue={["status", "type", "date"]}>
        {/* Status filter */}
        <AccordionItem value="status">
          <AccordionTrigger className="text-sm font-medium">
            转录状态
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Select
              value={filters.status}
              onValueChange={(value: FilterOptions["status"]) =>
                updateFilter("status", value)
              }
            >
              <SelectTrigger className="touch-manipulation">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* File type filter */}
        <AccordionItem value="type">
          <AccordionTrigger className="text-sm font-medium">
            文件类型
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Select
              value={filters.fileType}
              onValueChange={(value: FilterOptions["fileType"]) =>
                updateFilter("fileType", value)
              }
            >
              <SelectTrigger className="touch-manipulation">
                <SelectValue placeholder="选择文件类型" />
              </SelectTrigger>
              <SelectContent>
                {fileTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Date range filter */}
        <AccordionItem value="date">
          <AccordionTrigger className="text-sm font-medium">
            时间范围
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Select
              value={filters.dateRange}
              onValueChange={(value: FilterOptions["dateRange"]) =>
                updateFilter("dateRange", value)
              }
            >
              <SelectTrigger className="touch-manipulation">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* File size filter */}
        <AccordionItem value="size">
          <AccordionTrigger className="text-sm font-medium">
            文件大小
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Select
              value={filters.maxSize?.toString() || ""}
              onValueChange={(value) =>
                updateFilter("maxSize", value ? Number(value) : undefined)
              }
            >
              <SelectTrigger className="touch-manipulation">
                <SelectValue placeholder="选择最大文件大小" />
              </SelectTrigger>
              <SelectContent>
                {fileSizePresets.map((option) => (
                  <SelectItem
                    key={option.value || "all"}
                    value={option.value?.toString() || ""}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      {/* Sort options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">排序方式</Label>
        <Select
          value={sortBy}
          onValueChange={(value: SortOptions) => onSortChange(value)}
        >
          <SelectTrigger className="touch-manipulation">
            <SelectValue placeholder="选择排序方式" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Apply button */}
      <Button
        className="w-full touch-manipulation"
        onClick={() => {
          // Close the sheet or apply filters
          console.log("Applying filters:", filters, "Sort:", sortBy);
        }}
      >
        应用过滤器
      </Button>
    </div>
  );
}
