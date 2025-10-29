/**
 * 简化的文件卡片组件
 * 显示文件基本信息和转录状态
 */

"use client";

import { formatFileSize, formatDate } from "@/lib/utils/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { FileRow } from "@/types/db/database";
import type { TranscriptionTask } from "@/types/transcription";

interface FileCardProps {
  file: FileRow;
  transcriptionTask?: TranscriptionTask;
  onPlay?: (fileId: number) => void;
  onDelete?: (fileId: number) => void;
  onTranscribe?: (fileId: number) => void;
}

export default function FileCard({
  file,
  transcriptionTask,
  onPlay,
  onDelete,
  onTranscribe,
}: FileCardProps) {
  const getStatusDisplay = () => {
    if (!transcriptionTask) {
      return {
        icon: Clock,
        color: "text-gray-500",
        label: "未转录",
        variant: "secondary" as const,
      };
    }

    switch (transcriptionTask.status) {
      case "processing":
        return {
          icon: Loader2,
          color: "text-blue-500",
          label: "转录中",
          variant: "default" as const,
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          label: "已完成",
          variant: "default" as const,
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-500",
          label: "失败",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-500",
          label: "未转录",
          variant: "secondary" as const,
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* 文件信息 */}
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)} • {formatDate(file.createdAt)}
            </p>
          </div>

          {/* 转录状态 */}
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`h-4 w-4 ${status.color} ${transcriptionTask?.status === "processing" ? "animate-spin" : ""}`}
            />
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
          </div>

          {/* 转录进度 */}
          {transcriptionTask?.status === "processing" && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>转录进度</span>
                <span>{transcriptionTask.progress.progress}%</span>
              </div>
              <Progress
                value={transcriptionTask.progress.progress}
                className="h-1"
              />
              {transcriptionTask.progress.message && (
                <p className="text-xs text-gray-500 truncate">
                  {transcriptionTask.progress.message}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            {transcriptionTask?.status === "completed" ? (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => onPlay?.(file.id!)}
              >
                <Play className="h-3 w-3 mr-1" />
                播放
              </Button>
            ) : transcriptionTask?.status === "processing" ? (
              <Button size="sm" variant="outline" disabled className="flex-1">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                转录中
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => onTranscribe?.(file.id!)}
              >
                <Play className="h-3 w-3 mr-1" />
                转录
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete?.(file.id!)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
