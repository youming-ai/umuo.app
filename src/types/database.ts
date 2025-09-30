export interface FileRow {
  id?: number;
  name: string;
  size: number;
  type: string;
  blob?: Blob; // 对于大文件，此字段可能为空
  isChunked?: boolean; // 是否使用分块存储
  chunkSize?: number; // 每个分块的大小
  totalChunks?: number; // 总分块数
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文件分块存储行
 */
export interface FileChunkRow {
  id?: number;
  fileId: number;
  chunkIndex: number;
  chunkSize: number;
  offset: number;
  data: Blob;
  createdAt: Date;
}

export interface TranscriptRow {
  id?: number;
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  rawText?: string;
  language?: string;
  error?: string;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface Segment {
  id?: number;
  transcriptId: number;
  start: number;
  end: number;
  text: string;
  normalizedText?: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
  wordTimestamps?: WordTimestamp[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileWithTranscripts extends FileRow {
  transcripts: TranscriptRow[];
}

export interface TranscriptWithSegments extends TranscriptRow {
  segments: Segment[];
}

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface DatabaseStats {
  totalFiles: number;
  totalTranscripts: number;
  totalSegments: number;
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}
