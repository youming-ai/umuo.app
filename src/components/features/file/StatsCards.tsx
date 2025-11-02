"use client";

import { useFiles } from "@/hooks";
import { FileStatus } from "@/types/db/database";

interface StatsCardsProps {
  className?: string;
}

export default function StatsCards({ className }: StatsCardsProps) {
  const { files } = useFiles();

  // 计算统计数据
  const totalFiles = files.length;
  const totalDuration = files.reduce((acc, file) => acc + (file.duration || 0), 0);

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // 计算当前状态
  const getProcessingStatus = () => {
    if (!files || files.length === 0) return "空闲";

    const processingFiles = files.filter((file) => file.status === FileStatus.TRANSCRIBING);

    if (processingFiles.length > 0) return "转录中";
    return "空闲";
  };

  // 统计卡片数据
  const stats = [
    {
      label: "已上传文件",
      value: totalFiles.toString(),
      icon: "folder",
    },
    {
      label: "总时长",
      value: formatDuration(totalDuration),
      icon: "schedule",
    },
    {
      label: "当前状态",
      value: getProcessingStatus(),
      icon: "status",
    },
  ];

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="card-default">
          <p className="text-stats-label">{stat.label}</p>
          <p className="text-stats-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
