"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export default function FileUpload({
  onFilesSelected,
  isUploading = false,
  uploadProgress = 0,
  className = "",
}: FileUploadProps) {
  const [_isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDescriptionId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsDragActive(false);
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected],
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
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // 清空input以允许重复选择相同文件
      event.target.value = "";
    },
    [onFilesSelected],
  );

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className="upload-area cursor-pointer"
        role="region"
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
            拖拽文件到这里
          </p>
          <p className="text-sm text-[var(--text-muted)]">支持 MP3、WAV、M4A、OGG、FLAC 格式</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleFileInputClick}
          aria-describedby="upload-description"
        >
          <span>选择文件</span>
        </button>
      </div>

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
