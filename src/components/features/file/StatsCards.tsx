"use client";

import { useFiles } from "@/hooks";

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
  ];

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 mb-8 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="stats-card">
          <div className="flex items-center justify-between">
            <p className="text-stats-label">{stat.label}</p>
            <span className="material-symbols-outlined text-3xl text-gray-400">{stat.icon}</span>
          </div>
          <p className="text-stats-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
