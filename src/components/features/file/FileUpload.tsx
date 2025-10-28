"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
  currentFileCount?: number; // 当前已上传的文件数量
  maxFiles?: number; // 最大文件数量限制
}

export default function FileUpload({
  onFilesSelected,
  isUploading = false,
  uploadProgress = 0,
  className = "",
  currentFileCount = 0,
  maxFiles = 5,
}: FileUploadProps) {
  const [_isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDescriptionId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsDragActive(false);

      // 检查文件数量限制
      const remainingSlots = maxFiles - currentFileCount;
      if (remainingSlots <= 0) {
        // 可以添加toast通知
        console.error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
        return;
      }

      // 如果选择的文件超过剩余槽位，只取前面的文件
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      if (filesToAdd.length < acceptedFiles.length) {
        console.warn(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);
      }

      if (filesToAdd.length > 0) {
        onFilesSelected(filesToAdd);
      }
    },
    [onFilesSelected, currentFileCount, maxFiles],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
    },
    multiple: true,
    disabled: isUploading,
    noClick: true, // 禁用默认的点击行为，使用我们自定义的处理
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // 检查文件数量限制
      const remainingSlots = maxFiles - currentFileCount;
      if (remainingSlots <= 0) {
        console.error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
        event.target.value = "";
        return;
      }

      // 如果选择的文件超过剩余槽位，只取前面的文件
      const filesToAdd = files.slice(0, remainingSlots);
      if (filesToAdd.length < files.length) {
        console.warn(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);
      }

      if (filesToAdd.length > 0) {
        onFilesSelected(filesToAdd);
      }

      // 清空input以允许重复选择相同文件
      event.target.value = "";
    },
    [onFilesSelected, currentFileCount, maxFiles],
  );

  const isDisabled = isUploading || currentFileCount >= maxFiles;
  const remainingSlots = maxFiles - currentFileCount;

  return (
    <div className={className}>
      <section
        {...getRootProps()}
        className={`upload-area cursor-pointer ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="文件上传区域"
        aria-describedby={uploadDescriptionId}
      >
        <input
          {...getInputProps()}
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="选择音频文件"
        />

        <span
          className="material-symbols-outlined text-6xl text-[var(--text-color)]"
          aria-hidden="true"
        >
          cloud_upload
        </span>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-bold text-[var(--text-primary)]" id={uploadDescriptionId}>
            {currentFileCount >= maxFiles ? "已达到文件数量上限" : "拖拽文件到这里"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {currentFileCount >= maxFiles
              ? `最多支持 ${maxFiles} 个文件`
              : `支持 MP3、WAV、M4A、OGG、FLAC 格式 (${currentFileCount}/${maxFiles})`}
          </p>
          {currentFileCount < maxFiles && remainingSlots > 0 && (
            <p className="text-xs text-[var(--text-muted)]">还可添加 {remainingSlots} 个文件</p>
          )}
        </div>

        <button
          type="button"
          className={`btn-primary ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleFileInputClick}
          aria-describedby={uploadDescriptionId}
          disabled={isDisabled}
        >
          <span>{currentFileCount >= maxFiles ? "已达到上限" : "选择文件"}</span>
        </button>
      </section>

      {/* 上传进度指示器 */}
      {isUploading && (
        <div className="mt-4 text-center">
          <p className="mb-2 text-sm text-[var(--text-muted)]">上传中... {uploadProgress}%</p>
          <div className="h-2 w-full rounded-full bg-[var(--border-muted)]">
            <div
              className="bg-[var(--button-color)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
