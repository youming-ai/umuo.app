/**
 * 播放器页面
 * 简化版本 - 转录操作在文件主页处理
 */

"use client";

import { useParams } from "next/navigation";
import PlayerErrorBoundary from "@/components/features/player/PlayerErrorBoundary";
import PlayerPageComponent from "@/components/features/player/PlayerPage";

export default function PlayerPage() {
  const params = useParams();
  const fileId = params.fileId as string;

  return (
    <PlayerErrorBoundary>
      <PlayerPageComponent fileId={fileId} />
    </PlayerErrorBoundary>
  );
}
