/**
 * Audio Processing Web Worker
 *
 * Handles audio decoding, processing, and chunking operations off the main thread
 * to improve performance and prevent UI blocking during large audio file processing.
 */

// Import types (these will be available in the worker context)
interface AudioChunk {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  blob?: Blob;
  overlapDuration: number;
}

interface WorkerMessage {
  id: string;
  type: 'audio_decode' | 'audio_process' | 'audio_chunk' | 'memory_cleanup' | 'analyze_audio';
  data: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Audio context for processing
let audioContext: AudioContext | null = null;

/**
 * Initialize audio context in the worker
 */
function initializeAudioContext(): void {
  if (!audioContext) {
    audioContext = new (typeof AudioContext !== 'undefined'
      ? AudioContext
      : (webkitAudioContext as any))();
  }
}

/**
 * Decode audio data from array buffer
 */
async function decodeAudioData(audioData: ArrayBuffer): Promise<{
  decoded: boolean;
  channels: number;
  sampleRate: number;
  duration: number;
}> {
  try {
    initializeAudioContext();

    const audioBuffer = await audioContext!.decodeAudioData(audioData.slice());

    return {
      decoded: true,
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration
    };
  } catch (error) {
    console.error('Audio decoding failed:', error);
    throw new Error(`Audio decoding failed: ${error.message}`);
  }
}

/**
 * Process audio chunks for playback or transcription
 */
async function processAudioChunks(
  chunks: AudioChunk[],
  startTime: number,
  endTime: number
): Promise<{
  audioData: ArrayBuffer;
  duration: number;
  sampleRate: number;
  channels: number;
}> {
  try {
    initializeAudioContext();

    // Filter chunks that overlap with requested time range
    const relevantChunks = chunks.filter(chunk =>
      chunk.endTime > startTime && chunk.startTime < endTime
    );

    if (relevantChunks.length === 0) {
      throw new Error('No relevant chunks found for the specified time range');
    }

    // Process chunks in sequence (in a real implementation, this would be more sophisticated)
    let combinedDuration = 0;
    let sampleRate = 44100;
    let channels = 2;

    for (const chunk of relevantChunks) {
      if (chunk.blob) {
        const arrayBuffer = await chunk.blob.arrayBuffer();
        const audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

        sampleRate = audioBuffer.sampleRate;
        channels = audioBuffer.numberOfChannels;
        combinedDuration += audioBuffer.duration;
      }
    }

    // Create combined audio buffer (simplified implementation)
    const totalSamples = Math.floor(combinedDuration * sampleRate);
    const audioData = new ArrayBuffer(totalSamples * channels * 2); // 16-bit samples

    return {
      audioData,
      duration: combinedDuration,
      sampleRate,
      channels
    };
  } catch (error) {
    console.error('Audio chunk processing failed:', error);
    throw new Error(`Audio chunk processing failed: ${error.message}`);
  }
}

/**
 * Process a single audio chunk
 */
async function processAudioChunk(chunkData: {
  chunk: AudioChunk;
  operation: 'decode' | 'analyze' | 'convert';
}): Promise<{
  processed: boolean;
  chunkData: AudioChunk;
  analysis?: {
    peakAmplitude: number;
    averageAmplitude: number;
    zeroCrossingRate: number;
  };
}> {
  try {
    if (chunkData.operation === 'analyze' && chunkData.chunk.blob) {
      // Perform audio analysis
      const arrayBuffer = await chunkData.chunk.blob.arrayBuffer();
      const audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

      const analysis = analyzeAudioBuffer(audioBuffer);

      return {
        processed: true,
        chunkData: chunkData.chunk,
        analysis
      };
    } else if (chunkData.operation === 'convert' && chunkData.chunk.blob) {
      // Convert audio format (simplified)
      const arrayBuffer = await chunkData.chunk.blob.arrayBuffer();
      const audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

      // Convert to WAV format
      const wavBuffer = audioBufferToWav(audioBuffer);

      return {
        processed: true,
        chunkData: {
          ...chunkData.chunk,
          blob: new Blob([wavBuffer], { type: 'audio/wav' })
        }
      };
    } else {
      return {
        processed: true,
        chunkData: chunkData.chunk
      };
    }
  } catch (error) {
    console.error('Audio chunk processing failed:', error);
    throw new Error(`Audio chunk processing failed: ${error.message}`);
  }
}

/**
 * Analyze audio buffer for characteristics
 */
function analyzeAudioBuffer(audioBuffer: AudioBuffer): {
  peakAmplitude: number;
  averageAmplitude: number;
  zeroCrossingRate: number;
} {
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  let peakAmplitude = 0;
  let sumAmplitude = 0;
  let zeroCrossings = 0;

  for (let i = 0; i < channelData.length; i++) {
    const sample = channelData[i];
    peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
    sumAmplitude += Math.abs(sample);

    if (i > 0 && ((sample >= 0) !== (channelData[i - 1] >= 0))) {
      zeroCrossings++;
    }
  }

  return {
    peakAmplitude,
    averageAmplitude: sumAmplitude / channelData.length,
    zeroCrossingRate: zeroCrossings / channelData.length
  };
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numberOfChannels * 2;
  const outputBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(outputBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952);
  // file length
  setUint32(36 + length);
  // RIFF type
  setUint32(0x45564157);
  // format chunk identifier
  setUint32(0x20746d66);
  // format chunk length
  setUint32(16);
  // sample format (raw)
  setUint16(1);
  // channel count
  setUint16(numberOfChannels);
  // sample rate
  setUint32(audioBuffer.sampleRate);
  // byte rate
  setUint32(audioBuffer.sampleRate * numberOfChannels * 2);
  // block align
  setUint16(numberOfChannels * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  setUint32(0x61746164);
  // data chunk length
  setUint32(length);

  // Write interleaved data
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < outputBuffer.byteLength) {
    for (let i = 0; i < numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return outputBuffer;
}

/**
 * Perform memory cleanup operations
 */
async function performMemoryCleanup(): Promise<{
  cleaned: boolean;
  freedMemory?: number;
}> {
  try {
    let freedMemory = 0;

    // Close audio context if not in use
    if (audioContext && audioContext.state !== 'running') {
      audioContext.close();
      audioContext = null;
      freedMemory += 10; // Estimate 10MB freed
    }

    // Force garbage collection if available
    if (typeof gc !== 'undefined') {
      gc();
      freedMemory += 5; // Estimate additional 5MB freed
    }

    return {
      cleaned: true,
      freedMemory
    };
  } catch (error) {
    console.error('Memory cleanup failed:', error);
    return {
      cleaned: false
    };
  }
}

/**
 * Analyze audio file characteristics
 */
async function analyzeAudio(audioData: ArrayBuffer): Promise<{
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  format: string;
  quality: 'low' | 'medium' | 'high';
}> {
  try {
    initializeAudioContext();
    const audioBuffer = await audioContext!.decodeAudioData(audioData.slice());

    // Estimate bitrate (simplified)
    const estimatedBitrate = Math.round(
      (audioData.length * 8) / audioBuffer.duration / 1000
    );

    // Determine quality based on sample rate and bitrate
    let quality: 'low' | 'medium' | 'high' = 'medium';
    if (audioBuffer.sampleRate >= 44100 && estimatedBitrate >= 128) {
      quality = 'high';
    } else if (audioBuffer.sampleRate < 22050 || estimatedBitrate < 64) {
      quality = 'low';
    }

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      bitrate: estimatedBitrate,
      format: 'unknown', // Would need more sophisticated detection
      quality
    };
  } catch (error) {
    console.error('Audio analysis failed:', error);
    throw new Error(`Audio analysis failed: ${error.message}`);
  }
}

/**
 * Handle incoming messages from main thread
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;

  try {
    let result;

    switch (type) {
      case 'audio_decode':
        result = await decodeAudioData(data.audioData);
        break;

      case 'audio_process':
        result = await processAudioChunks(
          data.chunks,
          data.startTime,
          data.endTime
        );
        break;

      case 'audio_chunk':
        result = await processAudioChunk(data);
        break;

      case 'memory_cleanup':
        result = await performMemoryCleanup();
        break;

      case 'analyze_audio':
        result = await analyzeAudio(data.audioData);
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    // Send success response
    const response: WorkerResponse = {
      id,
      success: true,
      result
    };

    self.postMessage(response);

  } catch (error) {
    console.error(`Worker task ${type} failed:`, error);

    // Send error response
    const response: WorkerResponse = {
      id,
      success: false,
      error: error.message
    };

    self.postMessage(response);
  }
});

/**
 * Handle worker termination
 */
self.addEventListener('close', () => {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeAudioData,
    processAudioChunks,
    processAudioChunk,
    performMemoryCleanup,
    analyzeAudio
  };
}
