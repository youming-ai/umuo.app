"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import FileList from "@/components/file/FileList";
import FileUpload from "@/components/file/FileUpload";
import StatsCards from "@/components/file/StatsCards";
import Navigation from "@/components/ui/Navigation";
import { useAppState, useFiles } from "@/hooks";

export default function FileManager() {
  const router = useRouter();

  // 使用 hooks 获取数据
  const { fileUploadState, updateFileUploadState } = useAppState();
  const { files, addFiles, deleteFile } = useFiles(updateFileUploadState);
  const isPlaying = false;
  const currentFileId = undefined;

  // 适配文件处理函数 - 只上传文件，不进行转录
  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      try {
        await addFiles(selectedFiles);
        // 移除自动转录排队，只存储文件
      } catch (_error) {
        const { toast } = await import("sonner");
        toast.error("文件上传失败");
      }
    },
    [addFiles],
  );

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      deleteFile(fileId);
    },
    [deleteFile],
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
                  onPlayFile={handlePlayFile}
                  onDeleteFile={handleDeleteFile}
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
