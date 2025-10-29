/**
 * 优化的播放器页面
 * 使用新的转录状态管理系统
 */

"use client";

import { useParams } from "next/navigation";
import PlayerErrorBoundary from "@/components/features/player/PlayerErrorBoundary";
import PlayerPageComponent from "@/components/features/player/PlayerPage";
import { PlayerLoadingState } from "@/components/features/player/page/PlayerFallbackStates";
import { TranscriptionLoading } from "@/components/transcription/TranscriptionLoading";
import { usePlayerDataQuery } from "@/hooks/player/usePlayerDataQuery";

export default function PlayerPage() {
  const params = useParams();
  const fileId = params.fileId as string;

  // 获取播放器数据
  const {
    file,
    audioUrl,
    transcript,
    segments,
    isTranscribing,
    transcriptionProgress,
    loading,
    error,
    startTranscription,
    resetAutoTranscription,
  } = usePlayerDataQuery(fileId);

  return (
    <PlayerErrorBoundary>
      {loading && <PlayerLoadingState />}

      {error && (
        <div className="player-card flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-full p-3 mb-4">
            <span className="text-red-600 dark:text-red-400">!</span>
          </div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            加载失败
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 max-w-md">
            {error}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
            >
              返回
            </button>
            <button
              type="button"
              onClick={() =>
                error && !transcript
                  ? resetAutoTranscription()
                  : startTranscription()
              }
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm transition-colors"
            >
              {error && !transcript ? "重试转录" : "开始转录"}
            </button>
          </div>
        </div>
      )}

      {!file && !loading && !error && (
        <div className="player-card flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-3 mb-4">
            <span className="text-gray-600 dark:text-gray-400">?</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            文件不存在
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            找不到指定的音频文件。请检查文件是否已被删除。
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      )}

      {file && !transcript && !loading && !error && (
        <div className="player-card flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full p-3 mb-4">
            <span className="text-blue-600 dark:text-blue-400">🎵</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
            准备转录
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 max-w-md mb-6">
            此文件尚未转录，将自动开始转录处理。转录完成后，您就可以播放带字幕的音频。
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => startTranscription()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center justify-center"
            >
              {isTranscribing ? "转录中..." : "开始转录"}
            </button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-sm transition-colors"
            >
              稍后处理
            </button>
          </div>

          {isTranscribing && (
            <div className="mt-4 w-full max-w-xs">
              <TranscriptionLoading
                task={{
                  id: `task-${fileId}`,
                  fileId: parseInt(fileId, 10),
                  fileName: file?.name || "",
                  fileSize: file?.size || 0,
                  status: "processing",
                  priority: "normal",
                  progress: {
                    fileId: parseInt(fileId, 10),
                    status: "processing",
                    progress: transcriptionProgress,
                    message: "转录中...",
                    createdAt: new Date(),
                    options: {},
                  },
                }}
                showMessage={true}
                compact={false}
              />
            </div>
          )}
        </div>
      )}

      {file && audioUrl && transcript && segments && (
        <PlayerPageComponent fileId={fileId} />
      )}
    </PlayerErrorBoundary>
  );
}
