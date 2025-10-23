"use client";

import type { FileRow } from "@/types/db/database";
import FileCard from "./FileCard";

interface FileListProps {
  files: FileRow[];
  onPlayFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  isPlaying?: boolean;
  currentFileId?: string;
  className?: string;
}

export default function FileList({
  files,
  onPlayFile,
  onDeleteFile,
  isPlaying = false,
  currentFileId,
  className = "",
}: FileListProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4">
        {files.map((file) => {
          if (!file.id) return null;

          return (
            <FileCard
              key={file.id}
              file={file}
              onPlay={onPlayFile}
              onDelete={onDeleteFile}
              isPlaying={isPlaying}
              isCurrentFile={currentFileId === file.id?.toString()}
            />
          );
        })}
      </div>
    </div>
  );
}
