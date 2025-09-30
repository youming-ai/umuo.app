import type { Segment } from "@/types/database";

export interface SubtitleSegment {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface SubtitleFormat {
  format: "srt" | "vtt" | "json";
  content: string;
}

/**
 * 将Groq API返回的segments转换为字幕格式
 * @param segments Groq API返回的segments数组
 * @returns 转换后的字幕数据
 */
export function convertGroqSegmentsToSubtitles(segments: Segment[]): SubtitleSegment[] {
  if (!Array.isArray(segments)) {
    return [];
  }

  return segments.map((segment, index) => {
    const startMs = Math.round((segment.start || 0) * 1000);
    const endMs = Math.round((segment.end || 0) * 1000);

    return {
      index: index + 1,
      startTime: formatTime(startMs),
      endTime: formatTime(endMs),
      text: segment.text || "",
      startMs,
      endMs,
    };
  });
}

/**
 * 将字幕数据转换为SRT格式
 * @param subtitles 字幕数据数组
 * @returns SRT格式的字符串
 */
export function convertToSrt(subtitles: SubtitleSegment[]): string {
  return subtitles
    .map((subtitle) => {
      return `${subtitle.index}
${subtitle.startTime} --> ${subtitle.endTime}
${subtitle.text}`;
    })
    .join("\n\n");
}

/**
 * 将字幕数据转换为WebVTT格式
 * @param subtitles 字幕数据数组
 * @returns WebVTT格式的字符串
 */
export function convertToWebVtt(subtitles: SubtitleSegment[]): string {
  const header = "WEBVTT\n\n";
  const content = subtitles
    .map((subtitle) => {
      return `${subtitle.index}
${subtitle.startTime} --> ${subtitle.endTime}
${subtitle.text}`;
    })
    .join("\n\n");

  return header + content;
}

/**
 * 将字幕数据转换为JSON格式
 * @param subtitles 字幕数据数组
 * @returns JSON格式的字符串
 */
export function convertToJson(subtitles: SubtitleSegment[]): string {
  return JSON.stringify(subtitles, null, 2);
}

/**
 * 根据格式要求输出字幕
 * @param segments Groq API返回的segments数组
 * @param format 输出格式 ('srt' | 'vtt' | 'json')
 * @returns 格式化后的字幕数据
 */
export function exportSubtitles(
  segments: Segment[],
  format: "srt" | "vtt" | "json" = "srt",
): SubtitleFormat {
  const subtitles = convertGroqSegmentsToSubtitles(segments);

  let content: string;
  switch (format) {
    case "srt":
      content = convertToSrt(subtitles);
      break;
    case "vtt":
      content = convertToWebVtt(subtitles);
      break;
    case "json":
      content = convertToJson(subtitles);
      break;
    default:
      content = convertToSrt(subtitles);
  }

  return {
    format,
    content,
  };
}

/**
 * 格式化时间为字幕格式 (HH:MM:SS,mmm)
 * @param milliseconds 毫秒数
 * @returns 格式化的时间字符串
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  // SRT格式: HH:MM:SS,mmm
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/**
 * 格式化时间为WebVTT格式 (HH:MM:SS.mmm)
 * @param milliseconds 毫秒数
 * @returns 格式化的时间字符串
 */
function _formatTimeVtt(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  // VTT格式: HH:MM:SS.mmm
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

/**
 * 分析segments数据，提供调试信息
 * @param segments Groq API返回的segments数组
 * @returns 分析结果
 */
export function analyzeSegments(segments: Segment[]): {
  count: number;
  totalDuration: number;
  averageSegmentLength: number;
  timeGaps: number[];
  analysis: string;
} {
  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      count: 0,
      totalDuration: 0,
      averageSegmentLength: 0,
      timeGaps: [],
      analysis: "No segments provided",
    };
  }

  const count = segments.length;
  const totalDuration = segments[segments.length - 1].end || 0;
  const averageSegmentLength =
    segments.reduce((sum, seg) => sum + ((seg.end || 0) - (seg.start || 0)), 0) / count;

  // 计算时间间隔
  const timeGaps: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap > 0) {
      timeGaps.push(gap);
    }
  }

  const analysis = `
Segments Analysis:
- Total segments: ${count}
- Total duration: ${totalDuration.toFixed(2)}s
- Average segment length: ${averageSegmentLength.toFixed(2)}s
- Time gaps between segments: ${timeGaps.length} gaps found
- Average gap: ${timeGaps.length > 0 ? (timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length).toFixed(2) : 0}s
- Max gap: ${timeGaps.length > 0 ? Math.max(...timeGaps).toFixed(2) : 0}s
  `.trim();

  return {
    count,
    totalDuration,
    averageSegmentLength,
    timeGaps,
    analysis,
  };
}
