import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  // 对于小于 1KB 的文件，直接显示字节数
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formats time for WebVTT format (HH:MM:SS.mmm)
 */
export function formatTimeForVtt(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

/**
 * Generates WebVTT caption content from subtitle segments
 */
export function generateWebVttFromSegments(
  segments: Array<{ start: number; end: number; text: string }>,
): string {
  if (!segments || segments.length === 0) {
    return "";
  }

  let vttContent = "WEBVTT\n\n";

  segments.forEach((segment, index) => {
    const startTime = formatTimeForVtt(segment.start);
    const endTime = formatTimeForVtt(segment.end);

    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${segment.text}\n\n`;
  });

  return vttContent;
}

/**
 * Creates a Blob URL for WebVTT content
 */
export function createWebVttBlobUrl(vttContent: string): string {
  if (!vttContent) {
    return "";
  }

  const blob = new Blob([vttContent], { type: "text/vtt" });
  return URL.createObjectURL(blob);
}
