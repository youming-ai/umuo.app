import { FileUploadUtils } from "./file-upload";
import {
  API_TIMEOUT,
  DEFAULT_CHUNK_DURATION,
  DEFAULT_OVERLAP,
  MAX_CHUNKS,
  validateAudioDuration,
  validateFileSize,
} from "./transcription-config";
import { createObjectUrl, revokeObjectUrl } from "./url-manager";

export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  index: number;
}

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

/**
 * 获取音频持续时间
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = createObjectUrl(blob);
    let isResolved = false;

    // 超时处理
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        revokeObjectUrl(url);
        audio.src = "";
        reject(new Error(`Audio duration detection timeout after ${API_TIMEOUT}ms`));
      }
    }, API_TIMEOUT);

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        revokeObjectUrl(url);
        audio.src = "";
      }
    };

    audio.addEventListener("loadedmetadata", () => {
      if (!isResolved) {
        const duration = audio.duration;
        cleanup();
        resolve(duration);
      }
    });

    audio.addEventListener("error", (_error) => {
      if (!isResolved) {
        cleanup();
        reject(new Error("Failed to load audio metadata"));
      }
    });

    // 添加加载中止处理
    audio.addEventListener("abort", () => {
      if (!isResolved) {
        cleanup();
        reject(new Error("Audio loading was aborted"));
      }
    });

    try {
      audio.src = url;
    } catch (error) {
      cleanup();
      reject(
        new Error(
          `Failed to set audio source: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  });
}

/**
 * 切割音频为块
 */
export async function sliceAudio(
  blob: Blob,
  startTime: number,
  endTime: number,
  chunkSeconds: number = DEFAULT_CHUNK_DURATION,
  overlap: number = DEFAULT_OVERLAP,
): Promise<AudioChunk[]> {
  // 参数验证
  if (startTime >= endTime) {
    throw new Error("Invalid time range: start time must be less than end time");
  }

  if (startTime < 0) {
    throw new Error("Invalid start time: must be non-negative");
  }

  // 文件大小验证
  const sizeValidation = validateFileSize(blob.size);
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error || "File size validation failed");
  }

  const audioContext = new AudioContext();
  let isContextClosed = false;

  // 确保资源清理的辅助函数
  const closeAudioContext = async () => {
    if (!isContextClosed && audioContext.state !== "closed") {
      try {
        await audioContext.close();
        isContextClosed = true;
      } catch (closeError) {
        console.warn("Failed to close AudioContext:", closeError);
        isContextClosed = true; // 即使失败也标记为已关闭
      }
    }
  };

  // 设置超时机制
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Audio processing timeout after ${API_TIMEOUT}ms`));
    }, API_TIMEOUT);
  });

  try {
    const processingPromise = (async () => {
      // 添加超时保护的ArrayBuffer读取
      const arrayBuffer = await Promise.race([blob.arrayBuffer(), timeoutPromise]);

      // 添加超时保护的音频解码
      const audioBuffer = await Promise.race([
        audioContext.decodeAudioData(arrayBuffer),
        timeoutPromise,
      ]);

      // 检查时间范围是否在音频缓冲区内
      if (startTime >= audioBuffer.duration) {
        throw new Error("Start time exceeds audio duration");
      }

      const actualEndTime = Math.min(endTime, audioBuffer.duration);
      if (startTime >= actualEndTime) {
        throw new Error("Invalid time range after considering audio duration");
      }

      const chunks: AudioChunk[] = [];
      let currentStart = startTime;
      let chunkIndex = 0;

      while (currentStart < actualEndTime && chunkIndex < MAX_CHUNKS) {
        // 检查上下文状态
        if (audioContext.state === "closed") {
          throw new Error("AudioContext was closed unexpectedly");
        }

        const chunkEnd = Math.min(currentStart + chunkSeconds, actualEndTime);
        const chunkDuration = chunkEnd - currentStart;

        if (chunkDuration <= 0) {
          break;
        }

        // 使用实际的音频提取函数
        const chunkBlob = await extractAudioSegment(
          audioBuffer,
          currentStart,
          chunkEnd,
          audioContext,
        );

        chunks.push({
          blob: chunkBlob,
          startTime: currentStart,
          endTime: chunkEnd,
          duration: chunkDuration,
          index: chunkIndex,
        });

        currentStart = chunkEnd - overlap;
        chunkIndex++;
      }

      // 检查是否因为达到最大块数而停止
      if (chunkIndex >= MAX_CHUNKS) {
        console.warn(`Maximum chunk limit (${MAX_CHUNKS}) reached, stopping processing`);
      }

      return chunks;
    })();

    return await processingPromise;
  } catch (error) {
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("timeout")) {
      throw new Error(`音频处理超时: ${errorMessage}`);
    } else if (errorMessage.includes("decode")) {
      throw new Error(`音频解码失败: ${errorMessage}`);
    } else {
      throw new Error(`音频处理错误: ${errorMessage}`);
    }
  } finally {
    // 确保AudioContext被正确关闭
    await closeAudioContext();
  }
}

/**
 * 提取音频段
 */
async function extractAudioSegment(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  _audioContext: AudioContext,
): Promise<Blob> {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const frameCount = endSample - startSample;

  const numberOfChannels = audioBuffer.numberOfChannels;

  const offlineContext = new OfflineAudioContext(numberOfChannels, frameCount, sampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  const destination = offlineContext.createGain();
  source.connect(destination);
  destination.connect(offlineContext.destination);

  source.start(0, startTime, endTime - startTime);
  const renderedBuffer = await offlineContext.startRendering();
  const interleaved = interleave(renderedBuffer);
  const wavBlob = encodeWav(interleaved, renderedBuffer.sampleRate);

  return wavBlob;
}

/**
 * 交错音频通道
 */
function interleave(buffer: AudioBuffer): Float32Array {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels;
  const result = new Float32Array(length);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      result[i * numberOfChannels + channel] = channelData[i];
    }
  }

  return result;
}

/**
 * 编码WAV格式
 */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPcm = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPcm(view, 44, samples);

  return new Blob([view], { type: "audio/wav" });
}

/**
 * 处理音频文件
 */
export async function processAudioFile(
  fileBlobOrId: Blob | number,
  chunkSeconds: number = DEFAULT_CHUNK_DURATION,
  overlap: number = DEFAULT_OVERLAP,
): Promise<AudioChunk[]> {
  let fileBlob: Blob;

  // 如果传入的是数字，说明是文件ID，需要获取文件blob
  if (typeof fileBlobOrId === "number") {
    fileBlob = await FileUploadUtils.getFileBlob(fileBlobOrId);
  } else {
    fileBlob = fileBlobOrId;
  }
  const duration = await getAudioDuration(fileBlob);

  // 文件大小验证
  const sizeValidation = validateFileSize(fileBlob.size);
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error || "File size validation failed");
  }

  // 音频时长验证
  const durationValidation = validateAudioDuration(duration);
  if (!durationValidation.isValid) {
    throw new Error(durationValidation.error || "Audio duration validation failed");
  }

  const chunks = await sliceAudio(fileBlob, 0, duration, chunkSeconds, overlap);

  // 如果传入的是文件ID，更新文件元数据
  if (typeof fileBlobOrId === "number") {
    await FileUploadUtils.updateFileMetadata(fileBlobOrId, { duration });
  }
  return chunks;
}

/**
 * 获取音频元数据
 */
export async function getAudioMetadata(blob: Blob): Promise<AudioMetadata> {
  const audioContext = new AudioContext();
  let isContextClosed = false;

  const closeAudioContext = async () => {
    if (!isContextClosed && audioContext.state !== "closed") {
      try {
        await audioContext.close();
        isContextClosed = true;
      } catch (closeError) {
        console.warn("Failed to close AudioContext in getAudioMetadata:", closeError);
        isContextClosed = true;
      }
    }
  };

  try {
    // 添加超时保护
    const arrayBuffer = await Promise.race([
      blob.arrayBuffer(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ArrayBuffer read timeout")), API_TIMEOUT),
      ),
    ]);

    const audioBuffer = await Promise.race([
      audioContext.decodeAudioData(arrayBuffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Audio decode timeout")), API_TIMEOUT),
      ),
    ]);

    await closeAudioContext();

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      bitrate: Math.round((blob.size * 8) / audioBuffer.duration),
    };
  } catch (error) {
    await closeAudioContext();

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("timeout")) {
      throw new Error(`音频元数据获取超时: ${errorMessage}`);
    } else if (errorMessage.includes("decode")) {
      throw new Error(`音频解码失败: ${errorMessage}`);
    } else {
      throw new Error(`获取音频元数据失败: ${errorMessage}`);
    }
  }
}

/**
 * 合并音频块
 */
export async function mergeAudioChunks(chunks: AudioChunk[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error("No chunks to merge");
  }

  // 读取第一个音频块以确定实际采样率
  const audioContext = new AudioContext();
  const firstChunkArrayBuffer = await chunks[0].blob.arrayBuffer();
  const firstAudioBuffer = await audioContext.decodeAudioData(firstChunkArrayBuffer);
  const sampleRate = firstAudioBuffer.sampleRate; // 使用实际采样率而不是硬编码

  const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);
  const totalSamples = Math.floor(totalDuration * sampleRate);

  const mergedBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);

  const channelData = mergedBuffer.getChannelData(0);
  let currentSample = 0;

  for (const chunk of chunks) {
    const chunkArrayBuffer = await chunk.blob.arrayBuffer();
    const chunkAudioBuffer = await audioContext.decodeAudioData(chunkArrayBuffer);

    // 处理采样率不匹配的情况
    let chunkData: Float32Array = chunkAudioBuffer.getChannelData(0);
    if (chunkAudioBuffer.sampleRate !== sampleRate) {
      // 如果采样率不同，需要重新采样
      chunkData = await resampleAudioData(
        chunkData,
        chunkAudioBuffer.sampleRate,
        sampleRate,
        audioContext,
      );
    }

    const chunkSamples = Math.min(chunkData.length, totalSamples - currentSample);

    for (let i = 0; i < chunkSamples; i++) {
      if (currentSample + i < totalSamples) {
        channelData[currentSample + i] = chunkData[i];
      }
    }

    currentSample += chunkSamples;
  }

  await audioContext.close();

  const interleaved = interleave(mergedBuffer);
  return encodeWav(interleaved, sampleRate);
}

/**
 * 重新采样音频数据以匹配目标采样率
 * 使用简单的线性插值进行重新采样
 */
async function resampleAudioData(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
  _audioContext: AudioContext,
): Promise<Float32Array> {
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const outputData = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i * ratio;
    const lowerIndex = Math.floor(inputIndex);
    const upperIndex = Math.min(lowerIndex + 1, inputData.length - 1);
    const fraction = inputIndex - lowerIndex;

    // 线性插值
    outputData[i] = inputData[lowerIndex] * (1 - fraction) + inputData[upperIndex] * fraction;
  }

  return outputData;
}
