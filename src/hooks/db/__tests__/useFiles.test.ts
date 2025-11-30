import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DBUtils } from "@/lib/db/db";
import { useFiles } from "../useFiles";

// Mock DBUtils
vi.mock("@/lib/db/db", () => ({
  DBUtils: {
    getAllFiles: vi.fn(),
    addFile: vi.fn(),
    deleteFile: vi.fn(),
  },
  db: {},
}));

describe("useFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (DBUtils.getAllFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初始化", () => {
    it("should load files on mount", async () => {
      const mockFiles = [
        { id: 1, name: "test1.mp3", size: 1000, type: "audio/mpeg" },
        { id: 2, name: "test2.mp3", size: 2000, type: "audio/mpeg" },
      ];
      (DBUtils.getAllFiles as ReturnType<typeof vi.fn>).mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFiles());

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(DBUtils.getAllFiles).toHaveBeenCalledTimes(1);
      expect(result.current.files).toEqual(mockFiles);
    });

    it("should set isLoading to true during load", async () => {
      // 让 getAllFiles 延迟返回
      (DBUtils.getAllFiles as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      const { result } = renderHook(() => useFiles());

      // 初始状态应该是 loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle load error", async () => {
      const errorMessage = "Database connection failed";
      (DBUtils.getAllFiles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      expect(result.current.files).toEqual([]);
    });
  });

  describe("addFiles", () => {
    it("should add files and refresh list", async () => {
      const mockFile = new File(["content"], "test.mp3", { type: "audio/mpeg" });
      (DBUtils.addFile as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (DBUtils.getAllFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, name: "test.mp3", size: 7, type: "audio/mpeg" },
      ]);

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addFiles([mockFile]);
      });

      expect(DBUtils.addFile).toHaveBeenCalledTimes(1);
      expect(DBUtils.addFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test.mp3",
          type: "audio/mpeg",
        }),
      );

      // 应该刷新文件列表
      expect(DBUtils.getAllFiles).toHaveBeenCalledTimes(2);
    });

    it("should handle add error", async () => {
      const errorMessage = "Storage quota exceeded";
      (DBUtils.addFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockFile = new File(["content"], "test.mp3", { type: "audio/mpeg" });

      // 验证函数抛出错误
      await expect(
        act(async () => {
          await result.current.addFiles([mockFile]);
        }),
      ).rejects.toThrow(errorMessage);

      // 验证 addFile 被调用
      expect(DBUtils.addFile).toHaveBeenCalled();
    });

    it("should add multiple files", async () => {
      (DBUtils.addFile as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const files = [
        new File(["content1"], "test1.mp3", { type: "audio/mpeg" }),
        new File(["content2"], "test2.mp3", { type: "audio/mpeg" }),
      ];

      await act(async () => {
        await result.current.addFiles(files);
      });

      expect(DBUtils.addFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteFile", () => {
    it("should delete file and refresh list", async () => {
      (DBUtils.getAllFiles as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 1, name: "test.mp3" }])
        .mockResolvedValueOnce([]);
      (DBUtils.deleteFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.files.length).toBe(1);
      });

      await act(async () => {
        await result.current.deleteFile("1");
      });

      expect(DBUtils.deleteFile).toHaveBeenCalledWith(1);
      expect(result.current.files.length).toBe(0);
    });

    it("should handle invalid file id", async () => {
      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteFile("invalid");
      });

      // 不应该调用 deleteFile
      expect(DBUtils.deleteFile).not.toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
      const errorMessage = "File not found";
      (DBUtils.deleteFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 验证函数抛出错误
      await expect(
        act(async () => {
          await result.current.deleteFile("1");
        }),
      ).rejects.toThrow(errorMessage);

      // 验证 deleteFile 被调用
      expect(DBUtils.deleteFile).toHaveBeenCalledWith(1);
    });
  });

  describe("refreshFiles", () => {
    it("should reload files", async () => {
      const { result } = renderHook(() => useFiles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 初始加载
      expect(DBUtils.getAllFiles).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refreshFiles();
      });

      // 刷新后应该再次调用
      expect(DBUtils.getAllFiles).toHaveBeenCalledTimes(2);
    });
  });
});
