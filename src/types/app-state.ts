import type { FileRow, TranscriptRow } from "@/types/database";

export interface ViewState {
  currentView: "files" | "settings";
  selectedFile?: FileRow;
  isPlaying: boolean;
  currentTime: number;
}

export interface FileUploadState {
  selectedFiles: File[];
  isUploading: boolean;
  uploadProgress: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export interface AppState {
  files: FileRow[];
  transcripts: TranscriptRow[];
  viewState: ViewState;
  fileUploadState: FileUploadState;
  audioPlayerState: AudioPlayerState;
  isLoading: boolean;
}

export type ViewChangeHandler = (view: ViewState["currentView"]) => void;
export type FileSelectHandler = (files: File[]) => void;
export type FileActionHandler = (fileId: number) => void;
export type FilePlayHandler = (file: FileRow) => void;
export type SeekHandler = (time: number) => void;
