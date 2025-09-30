import { useCallback, useEffect, useState } from "react";
import { DbUtils } from "@/lib/db";
import { handleAndShowError } from "@/lib/error-handler";
import type { Segment, TranscriptRow } from "@/types/database";

export interface UseTranscriptsReturn {
  transcripts: TranscriptRow[];
  segments: Segment[];
  isLoading: boolean;
  loadAllTranscripts: () => Promise<void>;
  loadTranscriptsByFileId: (fileId: number) => Promise<void>;
  loadSegmentsByTranscriptId: (transcriptId: number) => Promise<void>;
  clearSegments: () => void;
  clearTranscripts: () => void;
}

/**
 * Custom hook for managing transcript and segment data
 */
export function useTranscripts(): UseTranscriptsReturn {
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllTranscripts = useCallback(async () => {
    try {
      setIsLoading(true);
      const allTranscripts = await DbUtils.getAllTranscripts();
      setTranscripts(allTranscripts);
    } catch (error) {
      handleAndShowError(error, "loadAllTranscripts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTranscriptsByFileId = useCallback(async (fileId: number) => {
    try {
      setIsLoading(true);
      const loadedTranscripts = await DbUtils.getTranscriptsByFileId(fileId);
      setTranscripts(loadedTranscripts);
    } catch (error) {
      handleAndShowError(error, "loadTranscriptsByFileId");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSegmentsByTranscriptId = useCallback(async (transcriptId: number) => {
    try {
      setIsLoading(true);
      const loadedSegments = await DbUtils.getSegmentsByTranscriptId(transcriptId);
      setSegments(loadedSegments);
    } catch (error) {
      handleAndShowError(error, "loadSegments");
      setSegments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
  }, []);

  // 自动加载所有转录记录，防止页面刷新时状态重置
  useEffect(() => {
    const initializeTranscripts = async () => {
      try {
        setIsLoading(true);
        await loadAllTranscripts();
      } catch (error) {
        handleAndShowError(error, "initializeTranscripts");
      } finally {
        setIsLoading(false);
      }
    };

    initializeTranscripts();
  }, [loadAllTranscripts]);

  return {
    transcripts,
    segments,
    isLoading,
    loadAllTranscripts,
    loadTranscriptsByFileId,
    loadSegmentsByTranscriptId,
    clearSegments,
    clearTranscripts,
  };
}
