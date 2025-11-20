"use client";

import { useCallback, useId, useRef, useState } from "react";

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
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDescriptionId = useId();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      setIsDragActive(false);

      // 文件类型过滤
      const audioFiles = fileArray.filter((file) => {
        const validTypes = [
          "audio/mp3",
          "audio/mpeg",
          "audio/wav",
          "audio/x-wav",
          "audio/m4a",
          "audio/mp4",
          "audio/ogg",
          "audio/flac",
        ];
        return validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i);
      });

      if (audioFiles.length === 0) {
        console.error("没有有效的音频文件");
        return;
      }

      if (audioFiles.length < fileArray.length) {
        console.warn(`${fileArray.length - audioFiles.length} 个文件不是支持的音频格式，已忽略`);
      }

      // 检查文件数量限制
      const remainingSlots = maxFiles - currentFileCount;
      if (remainingSlots <= 0) {
        console.error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
        return;
      }

      // 如果选择的文件超过剩余槽位，只取前面的文件
      const filesToAdd = audioFiles.slice(0, remainingSlots);
      if (filesToAdd.length < audioFiles.length) {
        console.warn(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);
      }

      if (filesToAdd.length > 0) {
        onFilesSelected(filesToAdd);
      }
    },
    [onFilesSelected, currentFileCount, maxFiles],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragActive) {
        setIsDragActive(true);
      }
    },
    [isDragActive],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      // 清空input以允许重复选择相同文件
      event.target.value = "";
    },
    [handleFiles],
  );

  const isDisabled = isUploading || currentFileCount >= maxFiles;
  const remainingSlots = maxFiles - currentFileCount;

  return (
    <div className={className}>
      <section
        className={`upload-area ${isDisabled ? "disabled" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileInputClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "Space") {
            event.preventDefault();
            if (!isDisabled) {
              handleFileInputClick();
            }
          }
        }}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="文件上传区域"
        aria-describedby={uploadDescriptionId}
        aria-disabled={isDisabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="选择音频文件"
        />

        <span
          className="material-symbols-outlined text-6xl text-[var(--state-success-text)]"
          aria-hidden="true"
        >
          cloud_upload
        </span>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-bold text-[var(--text-primary)]" id={uploadDescriptionId}>
            {currentFileCount >= maxFiles ? "已达到文件数量上限" : "拖拽文件到这里"}
          </p>
          <p className="text-md text-[var(--text-secondary)]">或者</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={(e) => {
            e.stopPropagation(); // 防止事件冒泡到section
            handleFileInputClick();
          }}
          aria-describedby={uploadDescriptionId}
          disabled={isDisabled}
        >
          <span>{currentFileCount >= maxFiles ? "已达到上限" : "选择文件"}</span>
        </button>

        <div className="flex flex-col items-center gap-1 mt-4">
          <p className="text-sm text-[var(--text-muted)]">
            {currentFileCount >= maxFiles
              ? `最多支持 ${maxFiles} 个文件`
              : `支持 MP3、WAV、M4A、OGG、FLAC 格式`}
          </p>
          {currentFileCount < maxFiles && remainingSlots > 0 && (
            <p className="text-xs text-[var(--text-muted)]">还可添加 {remainingSlots} 个文件</p>
          )}
        </div>
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
