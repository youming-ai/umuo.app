/**
 * 转录配置测试
 * 测试配置验证、错误处理和类型安全
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import {
  getTranscriptionConfig,
  getGroqSettings,
  isGroqAvailable,
  validateFileSize,
  validateAudioDuration,
  validateAudioFormat,
  validateChunkCount,
  validateAudioFile,
  ERROR_MESSAGES,
  MAX_FILE_SIZE,
  MAX_AUDIO_DURATION,
  SUPPORTED_AUDIO_FORMATS,
  MAX_CHUNKS,
} from "./transcription-config";

describe("转录配置", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("基本配置", () => {
    it("应该返回默认配置", () => {
      const config = getTranscriptionConfig();

      expect(config).toBeDefined();
      expect(config.timeoutMs).toBeGreaterThan(0);
      expect(config.retryCount).toBeGreaterThanOrEqual(0);
      expect(config.maxConcurrency).toBeGreaterThan(0);
    });

    it("应该支持环境变量覆盖", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        TRANSCRIPTION_TIMEOUT_MS: "60000",
        TRANSCRIPTION_RETRY_COUNT: "5",
        TRANSCRIPTION_MAX_CONCURRENCY: "3",
      };

      const config = getTranscriptionConfig();

      expect(config.timeoutMs).toBe(60000);
      expect(config.retryCount).toBe(5);
      expect(config.maxConcurrency).toBe(3);

      process.env = originalEnv;
    });

    it("应该处理无效的环境变量值", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        TRANSCRIPTION_TIMEOUT_MS: "invalid",
        TRANSCRIPTION_RETRY_COUNT: "not_a_number",
        TRANSCRIPTION_MAX_CONCURRENCY: "negative",
      };

      const config = getTranscriptionConfig();

      // 应该使用默认值
      expect(config.timeoutMs).toBeGreaterThan(0);
      expect(config.retryCount).toBeGreaterThanOrEqual(0);
      expect(config.maxConcurrency).toBeGreaterThan(0);

      process.env = originalEnv;
    });
  });

  describe("GROQ设置", () => {
    it("应该返回GROQ设置", () => {
      const settings = getGroqSettings();

      expect(settings).toBeDefined();
      expect(settings.model).toBe("whisper-large-v3-turbo");
      expect(settings.supportsLanguage).toBe(true);
      expect(settings.supportsPrompt).toBe(true);
      expect(settings.maxFileSize).toBe(MAX_FILE_SIZE);
      expect(settings.maxDuration).toBe(MAX_AUDIO_DURATION);
    });

    it("应该检查GROQ可用性", () => {
      const originalEnv = process.env;

      // 没有API密钥时
      delete process.env.GROQ_API_KEY;
      expect(isGroqAvailable()).toBe(false);

      // 有API密钥时
      process.env.GROQ_API_KEY = "gsk_test123456789";
      expect(isGroqAvailable()).toBe(true);

      process.env = originalEnv;
    });
  });

  describe("文件大小验证", () => {
    it("应该验证有效文件大小", () => {
      const result = validateFileSize(1024 * 1024); // 1MB

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("应该拒绝过大文件", () => {
      const result = validateFileSize(MAX_FILE_SIZE + 1);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.FILE_TOO_LARGE);
    });

    it("应该接受边界值", () => {
      const result = validateFileSize(MAX_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("音频时长验证", () => {
    it("应该验证有效音频时长", () => {
      const result = validateAudioDuration(1800); // 30分钟

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("应该拒绝过长音频", () => {
      const result = validateAudioDuration(MAX_AUDIO_DURATION + 1);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.AUDIO_TOO_LONG);
    });

    it("应该接受边界值", () => {
      const result = validateAudioDuration(MAX_AUDIO_DURATION);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("音频格式验证", () => {
    it("应该验证支持的音频格式", () => {
      for (const format of SUPPORTED_AUDIO_FORMATS) {
        const result = validateAudioFormat(format);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it("应该拒绝不支持的音频格式", () => {
      const result = validateAudioFormat("audio/unsupported");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_FORMAT);
    });

    it("应该处理空格式", () => {
      const result = validateAudioFormat("");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_FORMAT);
    });
  });

  describe("块数量验证", () => {
    it("应该验证有效块数量", () => {
      const result = validateChunkCount(50);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("应该拒绝过多块", () => {
      const result = validateChunkCount(MAX_CHUNKS + 1);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOO_MANY_CHUNKS);
    });

    it("应该接受边界值", () => {
      const result = validateChunkCount(MAX_CHUNKS);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("综合文件验证", () => {
    it("应该验证完全有效的文件", () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: "audio/wav",
        name: "test.wav",
      };

      const result = validateAudioFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该收集所有验证错误", () => {
      const file = {
        size: MAX_FILE_SIZE + 1, // 过大
        type: "audio/unsupported", // 不支持格式
        name: "test.unsupported",
      };

      const result = validateAudioFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain(ERROR_MESSAGES.FILE_TOO_LARGE);
      expect(result.errors).toContain(ERROR_MESSAGES.INVALID_FORMAT);
    });

    it("应该处理没有类型的文件", () => {
      const file = {
        size: 1024 * 1024,
        name: "test",
      };

      const result = validateAudioFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该处理空文件", () => {
      const file = {
        size: 0,
        type: "audio/wav",
        name: "empty.wav",
      };

      const result = validateAudioFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("错误消息常量", () => {
    it("应该提供完整的错误消息集", () => {
      expect(ERROR_MESSAGES.FILE_TOO_LARGE).toContain("500MB");
      expect(ERROR_MESSAGES.AUDIO_TOO_LONG).toContain("60 分钟");
      expect(ERROR_MESSAGES.INVALID_FORMAT).toBe("不支持的音频格式");
      expect(ERROR_MESSAGES.TOO_MANY_CHUNKS).toContain(`${MAX_CHUNKS} 个块`);
      expect(ERROR_MESSAGES.INVALID_API_KEY).toBe("无效的 API 密钥");
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBe("网络连接错误");
      expect(ERROR_MESSAGES.TRANSCRIPTION_FAILED).toBe("转录失败");
      expect(ERROR_MESSAGES.BROWSER_NOT_SUPPORTED).toBe("浏览器环境不支持，请使用服务器端API");
    });

    it("错误消息应该是唯一的", () => {
      const messages = Object.values(ERROR_MESSAGES);
      const uniqueMessages = new Set(messages);

      expect(messages.length).toBe(uniqueMessages.size);
    });
  });

  describe("配置常量", () => {
    it("应该提供合理的默认值", () => {
      expect(MAX_FILE_SIZE).toBe(500 * 1024 * 1024); // 500MB
      expect(MAX_AUDIO_DURATION).toBe(3600); // 1小时
      expect(MAX_CHUNKS).toBe(100);
      expect(SUPPORTED_AUDIO_FORMATS.length).toBeGreaterThan(0);
    });

    it("应该支持常见的音频格式", () => {
      const commonFormats = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"];

      for (const format of commonFormats) {
        expect(SUPPORTED_AUDIO_FORMATS).toContain(format);
      }
    });
  });

  describe("类型安全", () => {
    it("应该导出所有必要的类型和函数", () => {
      expect(typeof getTranscriptionConfig).toBe("function");
      expect(typeof getGroqSettings).toBe("function");
      expect(typeof isGroqAvailable).toBe("function");
      expect(typeof validateFileSize).toBe("function");
      expect(typeof validateAudioDuration).toBe("function");
      expect(typeof validateAudioFormat).toBe("function");
      expect(typeof validateChunkCount).toBe("function");
      expect(typeof validateAudioFile).toBe("function");
    });

    it("应该导出正确的常量", () => {
      expect(typeof MAX_FILE_SIZE).toBe("number");
      expect(typeof MAX_AUDIO_DURATION).toBe("number");
      expect(typeof MAX_CHUNKS).toBe("number");
      expect(Array.isArray(SUPPORTED_AUDIO_FORMATS)).toBe(true);
      expect(typeof ERROR_MESSAGES).toBe("object");
    });
  });
});
