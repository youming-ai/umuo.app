/**
 * 简化的文件卡片组件
 * 显示文件基本信息和转录状态
 */

"use client";

import { CheckCircle, Clock, Loader2, Play, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatFileSize } from "@/lib/utils/utils";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";

interface FileCardProps {
  file: FileRow;
  onPlay?: (fileId: number) => void;
  onDelete?: (fileId: number) => void;
  onTranscribe?: (fileId: number) => void;
  transcriptionProgress?: number;
}

export default function FileCard({
  file,
  onPlay,
  onDelete,
  onTranscribe,
  transcriptionProgress,
}: FileCardProps) {
  // 优雅地处理可能缺失的 file.id
  if (!file.id) {
    console.warn("FileCard: file.id is missing", file);
    return null;
  }

  const getStatusDisplay = () => {
    const status = file.status || FileStatus.UPLOADED;

    switch (status) {
      case FileStatus.TRANSCRIBING:
        return {
          icon: Loader2,
          color: "text-blue-500",
          label: "转录中",
          variant: "default" as const,
        };
      case FileStatus.COMPLETED:
        return {
          icon: CheckCircle,
          color: "text-green-500",
          label: "已完成",
          variant: "default" as const,
        };
      case FileStatus.ERROR:
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
              {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
            </p>
          </div>

          {/* 转录状态 */}
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`h-4 w-4 ${status.color} ${file.status === FileStatus.TRANSCRIBING ? "animate-spin" : ""}`}
            />
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
          </div>

          {/* 转录进度 */}
          {file.status === FileStatus.TRANSCRIBING && transcriptionProgress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>转录进度</span>
                <span>{transcriptionProgress}%</span>
              </div>
              <Progress value={transcriptionProgress} className="h-1" />
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            {file.status === FileStatus.COMPLETED ? (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => file.id && onPlay?.(file.id)}
              >
                <Play className="h-3 w-3 mr-1" />
                播放
              </Button>
            ) : file.status === FileStatus.TRANSCRIBING ? (
              <Button size="sm" variant="outline" disabled className="flex-1">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                转录中
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => file.id && onTranscribe?.(file.id)}
              >
                <Play className="h-3 w-3 mr-1" />
                转录
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={() => file.id && onDelete?.(file.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
