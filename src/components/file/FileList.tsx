"use client";

import { useMemo } from "react";
import type { TranscriptionProgress } from "@/lib/transcription-service";
import type { FileRow, TranscriptRow } from "@/types/database";
import FileCard from "./FileCard";

interface FileListProps {
  files: FileRow[];
  transcripts: TranscriptRow[];
  transcriptionProgress?: Map<string, TranscriptionProgress>;
  onPlayFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRetryTranscription: (fileId: string) => void;
  isPlaying?: boolean;
  currentFileId?: string;
  className?: string;
}

export default function FileList({
  files,
  transcripts,
  transcriptionProgress = new Map(),
  onPlayFile,
  onDeleteFile,
  onRetryTranscription,
  isPlaying = false,
  currentFileId,
  className = "",
}: FileListProps) {
  // 创建transcript映射以便快速查找
  const transcriptMap = useMemo(() => {
    const map = new Map<number, TranscriptRow>();
    transcripts.forEach((transcript) => {
      if (typeof transcript.fileId === "number") {
        map.set(transcript.fileId, transcript);
      }
    });
    return map;
  }, [transcripts]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4">
        {files.map((file) => {
          if (!file.id) return null;
          const transcript = transcriptMap.get(file.id);

          return (
            <FileCard
              key={file.id}
              file={file}
              transcript={transcript}
              transcriptionProgress={transcriptionProgress.get(file.id?.toString())}
              onPlay={onPlayFile}
              onDelete={onDeleteFile}
              onRetry={onRetryTranscription}
              isPlaying={isPlaying}
              isCurrentFile={currentFileId === file.id?.toString()}
            />
          );
        })}
      </div>
    </div>
  );
}
