/**
 * 简化的音频处理器
 * 移除复杂的分块处理逻辑，保留基本功能
 */

import {
  DEFAULT_CHUNK_DURATION,
  DEFAULT_OVERLAP,
  MAX_CHUNKS,
  validateAudioDuration,
  validateFileSize,
} from "./transcription-config";

export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  index: number;
}

export interface AudioMetadata {
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

/**
 * 简化的音频文件处理
 */
export async function processAudioFile(
  fileId: number,
  chunkDurationSeconds: number = DEFAULT_CHUNK_DURATION,
  overlapRatio: number = DEFAULT_OVERLAP,
): Promise<AudioChunk[]> {
  // 简化处理：返回单个音频块
  // 在实际应用中，这里可以添加更复杂的音频处理逻辑
  return [];
}

/**
 * 验证音频文件
 */
export function validateAudioFile(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证文件大小
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.isValid && sizeValidation.error) {
    errors.push(sizeValidation.error);
  }

  // 验证音频格式
  const supportedTypes = [
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/x-m4a",
  ];

  if (!supportedTypes.includes(file.type)) {
    errors.push("不支持的音频格式");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 获取音频元数据
 */
export async function getAudioMetadata(file: File): Promise<AudioMetadata> {
  return new Promise((resolve) => {
    const audio = new Audio();

    audio.addEventListener("loadedmetadata", () => {
      resolve({
        duration: audio.duration,
      });
    });

    audio.addEventListener("error", () => {
      resolve({
        duration: 0,
      });
    });

    audio.src = URL.createObjectURL(file);
  });
}

/**
 * 合并音频块
 */
export async function mergeAudioChunks(chunks: AudioChunk[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error("没有音频块可合并");
  }

  if (chunks.length === 1) {
    return chunks[0].blob;
  }

  // 简化处理：返回第一个音频块
  // 在实际应用中，这里需要实现音频合并逻辑
  return chunks[0].blob;
}

/**
 * 创建音频 URL
 */
export function createAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * 释放音频 URL
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
