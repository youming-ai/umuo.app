import { useState } from "react";
import type { FileUploadState, ViewState } from "@/types/app-state";
import { useTranscriptionManager } from "./useTranscriptionManager";

export interface UseAppStateReturn {
  viewState: ViewState;
  fileUploadState: FileUploadState;
  isLoading: boolean;
  transcriptionProgress?: Map<number, { progress: number; status: string; error?: string }>;
  setViewState: (state: ViewState) => void;
  setFileUploadState: (state: FileUploadState) => void;
  setIsLoading: (loading: boolean) => void;
  updateViewState: (updates: Partial<ViewState>) => void;
  updateFileUploadState: (updates: Partial<FileUploadState>) => void;
}

/**
 * Custom hook for managing general application state
 */
export function useAppState(): UseAppStateReturn {
  const [viewState, setViewState] = useState<ViewState>({
    currentView: "files",
    isPlaying: false,
    currentTime: 0,
  });

  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    selectedFiles: [],
    isUploading: false,
    uploadProgress: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  // 从转录管理器获取真实的进度信息
  const { transcriptionProgress } = useTranscriptionManager();

  const updateViewState = (updates: Partial<ViewState>) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  const updateFileUploadState = (updates: Partial<FileUploadState>) => {
    setFileUploadState((prev) => ({ ...prev, ...updates }));
  };

  return {
    viewState,
    fileUploadState,
    isLoading,
    transcriptionProgress,
    setViewState,
    setFileUploadState,
    setIsLoading,
    updateViewState,
    updateFileUploadState,
  };
}
