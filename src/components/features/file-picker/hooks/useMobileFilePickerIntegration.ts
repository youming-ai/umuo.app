"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFiles } from "@/hooks";
import { useMobileChunkedUpload } from "../file-upload/hooks/useMobileChunkedUpload";
import { useMobileFilePicker, MobileFilePickerProps } from "../MobileFilePicker";
import { useMobileFileUpload } from "../file-upload/hooks/useMobileFileUpload";
import type { FileRow } from "@/types/db/database";

interface MobileFilePickerIntegrationOptions extends Omit<MobileFilePickerProps, "onFilesSelected"> {
  // Integration options
  autoUpload?: boolean;
  addToDatabase?: boolean;
  updateFileList?: boolean;
  generateTranscriptions?: boolean;

  // Upload options
  chunkSize?: number;
  maxConcurrentUploads?: number;
  retryAttempts?: number;

  // Database options
  enableFileManagement?: boolean;
  fileTags?: string[];
  fileCategories?: string[];

  // Transcription options
  autoTranscribeAudio?: boolean;
  autoTranscribeVideo?: boolean;
  transcriptionLanguage?: string;

  // Callbacks
  onFilesUploaded?: (files: FileRow[]) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (files: FileRow[]) => void;
  onUploadError?: (error: Error) => void;
  onTranscriptionComplete?: (fileId: number, transcript: any) => void;
  onTranscriptionError?: (error: Error) => void;
}

interface IntegrationState {
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  processingStage: "idle" | "uploading" | "processing" | "transcribing" | "completed" | "error";
  uploadedFiles: FileRow[];
  errors: Error[];
  warnings: string[];
}

export function useMobileFilePickerIntegration(options: MobileFilePickerIntegrationOptions = {}) {
  const {
    autoUpload = true,
    addToDatabase = true,
    updateFileList = true,
    generateTranscriptions = false,
    chunkSize = 1024 * 1024, // 1MB
    maxConcurrentUploads = 3,
    retryAttempts = 3,
    enableFileManagement = true,
    fileTags = [],
    fileCategories = [],
    autoTranscribeAudio = true,
    autoTranscribeVideo = false,
    transcriptionLanguage = "en",
    onFilesUploaded,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onTranscriptionComplete,
    onTranscriptionError,
    ...mobilePickerOptions
  } = options;

  const { addFiles } = useFiles();
  const { uploadFiles: chunkedUpload } = useMobileChunkedUpload({
    chunkSize,
    maxConcurrent: maxConcurrentUploads,
    retryAttempts
  });

  const { uploadFiles: standardUpload } = useMobileFileUpload({
    onSuccess: (files) => {
      // Handle successful upload
      onFilesUploaded?.(files);
    },
    onError: (error) => {
      onUploadError?.(error);
    }
  });

  const queryClient = useQueryClient();
  const [state, setState] = useState<IntegrationState>({
    isUploading: false,
    isProcessing: false,
    uploadProgress: 0,
    processingStage: "idle",
    uploadedFiles: [],
    errors: [],
    warnings: []
  });

  // Handle file selection from mobile file picker
  const handleFilesSelected = useCallback(async (files: File[]) => {
    setState(prev => ({
      ...prev,
      isUploading: true,
      isProcessing: true,
      uploadProgress: 0,
      processingStage: "uploading",
      errors: [],
      warnings: []
    }));

    try {
      let uploadedFileRows: FileRow[] = [];

      // Upload files
      if (autoUpload) {
        setState(prev => ({ ...prev, processingStage: "uploading" }));

        // Choose upload method based on file sizes
        const useChunkedUpload = files.some(file => file.size > chunkSize);

        if (useChunkedUpload) {
          uploadedFileRows = await uploadWithProgress(files, chunkedUpload);
        } else {
          uploadedFileRows = await uploadWithProgress(files, standardUpload);
        }
      }

      // Add to database
      if (addToDatabase && uploadedFileRows.length > 0) {
        setState(prev => ({ ...prev, processingStage: "processing" }));

        // Add files to IndexedDB
        await addFiles(files);

        // Update file list in react query cache
        if (updateFileList) {
          queryClient.invalidateQueries({ queryKey: ["files"] });
        }
      }

      // Generate transcriptions if enabled
      if (generateTranscriptions) {
        setState(prev => ({ ...prev, processingStage: "transcribing" }));

        const transcriptionPromises = files.map(async (file, index) => {
          const shouldTranscribe =
            (autoTranscribeAudio && file.type.startsWith("audio/")) ||
            (autoTranscribeVideo && file.type.startsWith("video/"));

          if (shouldTranscribe && uploadedFileRows[index]) {
            try {
              const transcript = await startTranscription(
                uploadedFileRows[index].id,
                file,
                transcriptionLanguage
              );

              onTranscriptionComplete?.(uploadedFileRows[index].id, transcript);
            } catch (error) {
              onTranscriptionError?.(error instanceof Error ? error : new Error("Transcription failed"));
            }
          }
        });

        await Promise.allSettled(transcriptionPromises);
      }

      // Update final state
      setState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        uploadProgress: 100,
        processingStage: "completed",
        uploadedFiles: uploadedFileRows
      }));

      onUploadComplete?.(uploadedFileRows);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error("Upload failed");

      setState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        processingStage: "error",
        errors: [...prev.errors, errorObj]
      }));

      onUploadError?.(errorObj);
    }
  }, [
    autoUpload,
    addToDatabase,
    updateFileList,
    generateTranscriptions,
    autoTranscribeAudio,
    autoTranscribeVideo,
    chunkSize,
    transcriptionLanguage,
    chunkedUpload,
    standardUpload,
    addFiles,
    queryClient,
    onFilesUploaded,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onTranscriptionComplete,
    onTranscriptionError
  ]);

  // Helper function to upload files with progress tracking
  const uploadWithProgress = async (files: File[], uploadFunction: any): Promise<FileRow[]> => {
    let totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let uploadedSize = 0;

    // Simulate progress for files that don't provide native progress
    const progressInterval = setInterval(() => {
      const progress = (uploadedSize / totalSize) * 100;
      setState(prev => ({ ...prev, uploadProgress: progress }));
      onUploadProgress?.(progress);
    }, 100);

    try {
      const result = await uploadFunction(files);

      // Mark as complete
      setState(prev => ({ ...prev, uploadProgress: 100 }));
      onUploadProgress?.(100);

      return result;
    } finally {
      clearInterval(progressInterval);
    }
  };

  // Helper function to start transcription
  const startTranscription = async (
    fileId: number,
    file: File,
    language: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  };

  // Retry failed uploads
  const retryFailedUploads = useCallback(async () => {
    if (state.errors.length === 0) return;

    setState(prev => ({
      ...prev,
      errors: [],
      warnings: [...prev.warnings, "Retrying failed uploads..."]
    }));

    // This would need to track which files failed and retry them
    // For now, just clear errors and reset state
  }, [state.errors]);

  // Clear all state
  const clearState = useCallback(() => {
    setState({
      isUploading: false,
      isProcessing: false,
      uploadProgress: 0,
      processingStage: "idle",
      uploadedFiles: [],
      errors: [],
      warnings: []
    });
  }, []);

  // Get upload recommendations based on current state
  const getUploadRecommendations = useCallback(() => {
    const recommendations = [];

    if (state.errors.length > 0) {
      recommendations.push({
        type: "error" as const,
        message: `${state.errors.length} uploads failed. Consider retrying with smaller files.`,
        action: "retry"
      });
    }

    if (state.warnings.length > 0) {
      recommendations.push({
        type: "warning" as const,
        message: state.warnings.join(" "),
        action: "review"
      });
    }

    if (state.processingStage === "uploading" && state.uploadProgress < 10) {
      recommendations.push({
        type: "info" as const,
        message: "Upload is starting. Please wait...",
        action: "wait"
      });
    }

    return recommendations;
  }, [state]);

  // Props to pass to MobileFilePicker component
  const mobileFilePickerProps: MobileFilePickerProps = {
    ...mobilePickerOptions,
    onFilesSelected: handleFilesSelected,
    disabled: state.isUploading || state.isProcessing
  };

  return {
    // State
    state,
    isUploading: state.isUploading,
    isProcessing: state.isProcessing,
    uploadProgress: state.uploadProgress,
    processingStage: state.processingStage,
    uploadedFiles: state.uploadedFiles,
    errors: state.errors,
    warnings: state.warnings,

    // Actions
    handleFilesSelected,
    retryFailedUploads,
    clearState,

    // Utilities
    getUploadRecommendations,
    mobileFilePickerProps
  };
}

// Provider component for context integration
export function MobileFilePickerProvider({
  children,
  options = {}
}: {
  children: React.ReactNode;
  options?: MobileFilePickerIntegrationOptions;
}) {
  const integration = useMobileFilePickerIntegration(options);

  return (
    <MobileFilePickerContext.Provider value={integration}>
      {children}
    </MobileFilePickerContext.Provider>
  );
}

// Context for sharing integration state
const MobileFilePickerContext = React.createContext<ReturnType<typeof useMobileFilePickerIntegration> | null>(null);

// Hook to access integration context
export function useMobileFilePickerContext() {
  const context = React.useContext(MobileFilePickerContext);
  if (!context) {
    throw new Error("useMobileFilePickerContext must be used within a MobileFilePickerProvider");
  }
  return context;
}
