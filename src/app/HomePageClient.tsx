"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import FileList from "@/components/file/FileList";
import FileUpload from "@/components/file/FileUpload";
import StatsCards from "@/components/file/StatsCards";
import Navigation from "@/components/ui/Navigation";
import { useAppState, useFiles, useTranscriptionManager, useTranscripts } from "@/hooks";

export default function HomePageClient() {
  const router = useRouter();

  // 使用 hooks 获取数据
  const { fileUploadState, updateFileUploadState } = useAppState();
  const { files, addFiles, deleteFile } = useFiles(updateFileUploadState);
  const { transcripts } = useTranscripts();
  const { transcriptionProgress, queueTranscription, retryTranscription } =
    useTranscriptionManager();
  const isPlaying = false;
  const currentFileId = undefined;

  // 转换 transcriptionProgress 的键从 number 到 string 以匹配组件期望
  const progressMap = new Map(
    Array.from(transcriptionProgress.entries()).map(([key, value]) => [key.toString(), value]),
  );

  // 适配文件处理函数
  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      try {
        const uploadedFiles = await addFiles(selectedFiles);

        uploadedFiles.forEach((file) => {
          if (file.id) {
            queueTranscription(file);
          }
        });
      } catch (_error) {
        const { toast } = await import("sonner");
        toast.error("文件上传失败");
      }
    },
    [addFiles, queueTranscription],
  );

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      deleteFile(fileId);
    },
    [deleteFile],
  );

  // 处理重试转录
  const handleRetryTranscription = useCallback(
    (fileId: string) => {
      retryTranscription(parseInt(fileId, 10));
    },
    [retryTranscription],
  );

  // 处理播放文件
  const handlePlayFile = useCallback(
    (fileId: string) => {
      router.push(`/player/${fileId}`);
    },
    [router],
  );

  const isUploading = fileUploadState.isUploading;
  const uploadProgress = fileUploadState.uploadProgress;

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 mt-24">
          <div className="mx-auto max-w-4xl">
            <div className="space-y-8">
              <StatsCards />

              <div className="mb-8">
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                />
              </div>

              <div>
                <FileList
                  files={files || []}
                  transcripts={transcripts || []}
                  transcriptionProgress={progressMap}
                  onPlayFile={handlePlayFile}
                  onDeleteFile={handleDeleteFile}
                  onRetryTranscription={handleRetryTranscription}
                  isPlaying={isPlaying}
                  currentFileId={currentFileId}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
