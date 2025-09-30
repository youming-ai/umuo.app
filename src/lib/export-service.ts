import type { FileRow, Segment, TranscriptRow } from "@/types/database";
import { DbUtils } from "./db";
import { handleSilently } from "./error-handler";

export interface ExportData {
  version: string;
  exportedAt: string;
  files: FileRow[];
  transcripts: TranscriptRow[];
  segments: Segment[];
}

export const VERSION = "1.0.0";

export async function exportAllData(): Promise<Blob> {
  try {
    const files = await DbUtils.getAllFiles();
    // Get all transcripts by iterating through files
    const allTranscripts: TranscriptRow[] = [];
    const allSegments: Segment[] = [];

    for (const file of files) {
      if (file.id) {
        const transcripts = await DbUtils.getTranscriptsByFileId(file.id);
        allTranscripts.push(...transcripts);

        for (const transcript of transcripts) {
          if (transcript.id) {
            const segments = await DbUtils.getSegmentsByTranscriptId(transcript.id);
            allSegments.push(...segments);
          }
        }
      }
    }

    const exportData: ExportData = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      files,
      transcripts: allTranscripts,
      segments: allSegments,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  } catch (error) {
    throw new Error(
      `Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function exportFileData(fileId: number): Promise<Blob> {
  try {
    const file = await DbUtils.getFile(fileId);
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    const transcripts = await DbUtils.getTranscriptsByFileId(fileId);
    const segments: Segment[] = [];

    for (const transcript of transcripts) {
      if (transcript.id) {
        const transcriptSegments = await DbUtils.getSegmentsByTranscriptId(transcript.id);
        segments.push(...transcriptSegments);
      }
    }

    const exportData: ExportData = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      files: [file],
      transcripts,
      segments,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  } catch (error) {
    throw new Error(
      `Failed to export file data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function importData(file: File): Promise<{
  importedFiles: number;
  importedTranscripts: number;
  importedSegments: number;
}> {
  try {
    const text = await file.text();
    const data: ExportData = JSON.parse(text);

    // Validate export data
    if (!data.version || !data.files || !data.transcripts || !data.segments) {
      throw new Error("Invalid export file format");
    }

    let importedFiles = 0;
    let importedTranscripts = 0;
    let importedSegments = 0;

    // Import files
    for (const fileData of data.files) {
      try {
        // Remove ID to avoid conflicts
        const { id: _, ...fileWithoutId } = fileData;
        await DbUtils.addFile(fileWithoutId as FileRow);
        importedFiles++;
      } catch (error) {
        // 单个文件导入失败不影响整体导入流程
        handleSilently(error, "file-import");
      }
    }

    // Import transcripts
    for (const transcriptData of data.transcripts) {
      try {
        const { id: _, ...transcriptWithoutId } = transcriptData;
        await DbUtils.addTranscript(transcriptWithoutId as TranscriptRow);
        importedTranscripts++;
      } catch (error) {
        // 单个转录本导入失败不影响整体导入流程
        handleSilently(error, "transcript-import");
      }
    }

    // Import segments
    for (const segmentData of data.segments) {
      try {
        const { id: _, ...segmentWithoutId } = segmentData;
        await DbUtils.addSegment(segmentWithoutId as Segment);
        importedSegments++;
      } catch (error) {
        // 单个片段导入失败不影响整体导入流程
        handleSilently(error, "segment-import");
      }
    }

    return {
      importedFiles,
      importedTranscripts,
      importedSegments,
    };
  } catch (error) {
    throw new Error(
      `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateFilename(type: "all" | "file", fileId?: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (type === "file" && fileId) {
    return `shadowing-learning-file-${fileId}-${timestamp}.json`;
  }
  return `shadowing-learning-backup-${timestamp}.json`;
}

export function validateImportFile(file: File): boolean {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return file.type === "application/json" && file.size <= maxSize;
}
