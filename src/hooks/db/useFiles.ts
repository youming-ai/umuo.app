import { useCallback, useEffect, useState } from "react";
import { FileUploadUtils } from "@/lib/ai/file-upload";
import { handleAndShowError } from "@/lib/utils/error-handler";
import type { FileRow } from "@/types/db/database";

export interface UseFilesReturn {
  files: FileRow[];
  isLoading: boolean;
  loadFiles: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  addFiles: (files: File[] | FileList) => Promise<FileRow[]>;
  deleteFile: (fileId: string) => Promise<void>;
}

export interface FileUploadState {
  selectedFiles: File[];
  isUploading: boolean;
  uploadProgress: number;
}

/**
 * Custom hook for managing file data
 */
export function useFiles(
  setFileUploadState?: (state: FileUploadState) => void,
): UseFilesReturn {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedFiles = await FileUploadUtils.getAllFiles();
      setFiles(loadedFiles);
    } catch (error) {
      handleAndShowError(error, "loadFiles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const addFiles = useCallback(
    async (files: File[] | FileList) => {
      try {
        setIsLoading(true);
        // 统一处理 File[] 或 FileList
        const fileArray = Array.from(files);
        const uploadedFiles: FileRow[] = [];

        // 更新上传状态
        setFileUploadState?.({
          selectedFiles: fileArray,
          isUploading: true,
          uploadProgress: 0,
        });

        // 调用实际的文件上传逻辑
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];
          const fileId = await FileUploadUtils.uploadFile(file);

          // 获取上传的文件信息
          const uploadedFile = await FileUploadUtils.getFileInfo(fileId);
          uploadedFiles.push(uploadedFile);

          // 更新上传进度
          const progress = Math.round(((i + 1) / fileArray.length) * 100);
          setFileUploadState?.({
            selectedFiles: fileArray,
            isUploading: true,
            uploadProgress: progress,
          });
        }

        // 刷新文件列表
        await loadFiles();

        // 重置上传状态
        setFileUploadState?.({
          selectedFiles: [],
          isUploading: false,
          uploadProgress: 0,
        });

        // 返回上传的文件列表
        return uploadedFiles;
      } catch (error) {
        handleAndShowError(error, "addFiles");
        // 重置上传状态
        setFileUploadState?.({
          selectedFiles: [],
          isUploading: false,
          uploadProgress: 0,
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFiles, setFileUploadState],
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      try {
        setIsLoading(true);
        // 调用实际的文件删除逻辑
        await FileUploadUtils.deleteFile(parseInt(fileId, 10));

        // 刷新文件列表
        await loadFiles();
      } catch (error) {
        handleAndShowError(error, "deleteFile");
      } finally {
        setIsLoading(false);
      }
    },
    [loadFiles],
  );

  return {
    files,
    isLoading,
    loadFiles,
    refreshFiles,
    addFiles,
    deleteFile,
  };
}
