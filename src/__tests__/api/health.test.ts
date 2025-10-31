/**
 * API路由测试 - 健康检查接口
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/health/route";
import { NextRequest } from "next/server";

// Mock process.uptime
vi.mock("node:process", () => ({
  default: {
    uptime: vi.fn(() => 12345),
    version: "v20.0.0",
    env: {
      NODE_ENV: "test",
    },
    platform: "linux",
    arch: "x64",
  },
}));

describe("Health API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return basic health status", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("healthy");
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.uptime).toBe(12345);
      expect(data.data.environment).toBe("test");
      expect(data.data.services).toBeDefined();
      expect(data.data.services.groq).toBeDefined();
      expect(data.data.services.database).toBeDefined();
    });

    it("should include performance metrics", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.data.performance).toBeDefined();
      expect(data.data.performance.responseTime).toBeGreaterThan(0);
    });

    it("should set correct headers", async () => {
      const response = await GET();

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("X-Health-Check")).toBe("basic");
    });
  });

  describe("POST /api/health", () => {
    it("should return detailed health status when testConnections=false", async () => {
      const request = new NextRequest("http://localhost/api/health", {
        method: "POST",
        body: JSON.stringify({ testConnections: false }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.detailed).toBe(true);
      expect(data.data.system).toBeDefined();
      expect(data.data.runtime).toBeDefined();
      expect(data.data.services).toBeDefined();
    });

    it("should handle detailed health checks", async () => {
      const request = new NextRequest("http://localhost/api/health", {
        method: "POST",
        body: JSON.stringify({ testConnections: true }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.detailed).toBe(true);
      expect(data.data.connections).toBeDefined();
      expect(data.data.dependencies).toBeDefined();
    });

    it("should handle malformed JSON request", async () => {
      const request = new NextRequest("http://localhost/api/health", {
        method: "POST",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should handle missing request body gracefully", async () => {
      const request = new NextRequest("http://localhost/api/health", {
        method: "POST",
        body: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.detailed).toBe(true);
    });

    it("should include correct headers for detailed health check", async () => {
      const request = new NextRequest("http://localhost/api/health", {
        method: "POST",
        body: JSON.stringify({ testConnections: false }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("X-Health-Check")).toBe("OpenNext.js-Detailed");
      expect(response.headers.get("X-Platform")).toBe("cloudflare-workers");
    });
  });
});
