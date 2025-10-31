/**
 * API路由测试 - 转录接口
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/transcribe/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@ai-sdk/groq", () => ({
  groq: {
    audio: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  experimental_transcribe: vi.fn(),
}));

vi.mock("@/lib/utils/api-response", () => ({
  apiError: vi.fn(),
  apiSuccess: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    files: {
      get: vi.fn(),
    },
  },
}));

describe("Transcribe API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/transcribe", () => {
    it("should reject requests without fileId", async () => {
      const request = new NextRequest("http://localhost/api/transcribe", {
        method: "POST",
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("fileId is required");
    });

    it("should reject requests without audio file", async () => {
      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "123");

      const request = new NextRequest(url, {
        method: "POST",
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Audio file is required");
    });

    it("should validate fileId format", async () => {
      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "invalid");

      const formData = new FormData();
      formData.append("audio", new Blob(["audio data"], { type: "audio/mp3" }), "test.mp3");

      const request = new NextRequest(url, {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("fileId");
    });

    it("should handle valid transcription request", async () => {
      const { experimental_transcribe } = await import("ai");
      const { db } = await import("@/lib/db/db");

      // Mock successful file retrieval
      (db.files.get as any).mockResolvedValue({
        id: 123,
        name: "test.mp3",
        size: 1024,
        blob: new Blob(["audio data"], { type: "audio/mp3" }),
      });

      // Mock successful transcription
      (experimental_transcribe as any).mockResolvedValue({
        text: "转录文本内容",
        segments: [
          { start: 0, end: 2, text: "第一段" },
          { start: 2, end: 4, text: "第二段" },
        ],
      });

      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "123");
      url.searchParams.set("language", "ja");

      const formData = new FormData();
      formData.append("audio", new Blob(["audio data"], { type: "audio/mp3" }), "test.mp3");

      const request = new NextRequest(url, {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.text).toBe("转录文本内容");
      expect(data.data.segments).toHaveLength(2);
    });

    it("should handle transcription errors gracefully", async () => {
      const { experimental_transcribe } = await import("ai");
      const { db } = await import("@/lib/db/db");

      // Mock successful file retrieval
      (db.files.get as any).mockResolvedValue({
        id: 123,
        name: "test.mp3",
        size: 1024,
        blob: new Blob(["audio data"], { type: "audio/mp3" }),
      });

      // Mock transcription error
      (experimental_transcribe as any).mockRejectedValue(
        new Error("Transcription service unavailable")
      );

      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "123");

      const formData = new FormData();
      formData.append("audio", new Blob(["audio data"], { type: "audio/mp3" }), "test.mp3");

      const request = new NextRequest(url, {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("转录处理失败");
    });

    it("should validate audio file format", async () => {
      const { db } = await import("@/lib/db/db");

      // Mock successful file retrieval
      (db.files.get as any).mockResolvedValue({
        id: 123,
        name: "test.txt", // Invalid format
        size: 1024,
        blob: new Blob(["text data"], { type: "text/plain" }),
      });

      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "123");

      const formData = new FormData();
      formData.append("audio", new Blob(["text data"], { type: "text/plain" }), "test.txt");

      const request = new NextRequest(url, {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("不支持的音频格式");
    });

    it("should handle file not found", async () => {
      const { db } = await import("@/lib/db/db");

      // Mock file not found
      (db.files.get as any).mockResolvedValue(undefined);

      const url = new URL("http://localhost/api/transcribe");
      url.searchParams.set("fileId", "999");

      const formData = new FormData();
      formData.append("audio", new Blob(["audio data"], { type: "audio/mp3" }), "test.mp3");

      const request = new NextRequest(url, {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("文件不存在");
    });
  });
});
