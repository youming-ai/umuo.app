"use client";

import { useFiles, useTranscripts } from "@/hooks";

interface StatsCardsProps {
  className?: string;
}

export default function StatsCards({ className }: StatsCardsProps) {
  const { files } = useFiles();
  const { transcripts } = useTranscripts();

  // 计算统计数据
  const totalFiles = files.length;
  const totalDuration = files.reduce((acc, file) => acc + (file.duration || 0), 0);
  const completedFiles = transcripts.filter((t) => t.status === "completed").length;
  const processingFiles = transcripts.filter((t) => t.status === "processing").length;

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // 获取当前状态
  const getCurrentStatus = () => {
    if (processingFiles > 0) return "处理中";
    if (completedFiles === 0 && totalFiles === 0) return "空闲";
    if (completedFiles === totalFiles && totalFiles > 0) return "已完成";
    return "部分完成";
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
      value: getCurrentStatus(),
      icon: "devices",
    },
  ];

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8 ${className}`}>
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
