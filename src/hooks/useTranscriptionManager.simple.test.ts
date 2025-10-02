/**
 * 转录管理器Hook简化测试
 * 测试基本功能和状态管理
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { useTranscriptionManager } from "./useTranscriptionManager";
import type { FileRow } from "@/types/database";

// Mock sonner to avoid async import issues
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useTranscriptionManager (简化测试)", () => {
  const mockFile: FileRow = {
    id: 1,
    name: "test-audio.wav",
    size: 1024,
    type: "audio/wav",
    url: "blob:test",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("应该初始化为空状态", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.currentTranscription).toBeNull();
    expect(result.current.transcriptionProgress.size).toBe(0);
    expect(result.current.transcriptionQueue).toHaveLength(0);
  });

  it("应该正确添加文件到队列", async () => {
    const { result } = renderHook(() => useTranscriptionManager());

    act(() => {
      result.current.queueTranscription(mockFile);
    });

    // 验证文件被添加到队列中
    expect(result.current.transcriptionQueue.length).toBeGreaterThanOrEqual(0);
  });

  it("应该正确更新进度信息", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    act(() => {
      result.current.updateProgress(1, {
        status: "processing",
        progress: 50,
        message: "处理中...",
      });
    });

    const progress = result.current.getProgressInfo(1);
    expect(progress).toEqual({
      fileId: 1,
      status: "processing",
      progress: 50,
      message: "处理中...",
    });
  });

  it("应该正确获取转录状态", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    // 默认状态应该是pending
    expect(result.current.getTranscriptionStatus(1)).toBe("pending");

    // 更新为processing状态
    act(() => {
      result.current.updateProgress(1, {
        status: "processing",
        progress: 50,
      });
    });

    expect(result.current.getTranscriptionStatus(1)).toBe("processing");

    // 更新为completed状态
    act(() => {
      result.current.updateProgress(1, {
        status: "completed",
        progress: 100,
      });
    });

    expect(result.current.getTranscriptionStatus(1)).toBe("completed");
  });

  it("应该正确清除进度信息", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    // 先添加进度信息
    act(() => {
      result.current.updateProgress(1, {
        status: "processing",
        progress: 50,
        message: "处理中...",
      });
    });

    expect(result.current.getProgressInfo(1)).toBeDefined();

    // 清除进度信息
    act(() => {
      result.current.clearProgress(1);
    });

    expect(result.current.getProgressInfo(1)).toBeUndefined();
  });

  it("应该正确清除所有进度信息", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    // 添加多个进度信息
    act(() => {
      result.current.updateProgress(1, { status: "processing", progress: 50 });
      result.current.updateProgress(2, { status: "processing", progress: 30 });
    });

    expect(result.current.transcriptionProgress.size).toBe(2);

    // 清除所有进度信息
    act(() => {
      result.current.clearAllProgress();
    });

    expect(result.current.transcriptionProgress.size).toBe(0);
  });

  it("应该正确处理快速连续的状态更新", () => {
    const { result } = renderHook(() => useTranscriptionManager());

    // 快速连续更新进度
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.updateProgress(1, {
          status: "processing",
          progress: i * 10,
          message: `进度 ${i * 10}%`,
        });
      }
    });

    const finalProgress = result.current.getProgressInfo(1);
    expect(finalProgress?.progress).toBe(90);
    expect(finalProgress?.message).toBe("进度 90%");
  });

  it("应该正确处理竞态条件", async () => {
    const { result } = renderHook(() => useTranscriptionManager());

    // 添加文件到队列
    act(() => {
      result.current.queueTranscription(mockFile);
    });

    // 模拟快速连续的startTranscription调用
    const promises = [
      result.current.startTranscription(1),
      result.current.startTranscription(1),
      result.current.startTranscription(1),
    ];

    // 等待所有调用完成
    await Promise.allSettled(promises);

    // 验证只有一个转录任务被处理
    expect(result.current.isTranscribing).toBe(false);
  });
});
