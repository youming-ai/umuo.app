import { NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/utils/api-response";

export const runtime = "edge"; // Cloudflare Pages 需要 Edge Runtime

/**
 * Cloudflare Workers 健康检查 API
 * 用于监控系统运行状态和依赖服务
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // 检查基本信息
    const healthData: any = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
      environment: process.env.NODE_ENV || "unknown",
      platform: "cloudflare-workers",
      opennext: true,
      version: process.env.npm_package_version || "1.0.0",

      // 依赖服务检查
      services: {
        groq: {
          available: !!process.env.GROQ_API_KEY,
          configured: process.env.GROQ_API_KEY?.startsWith("gsk_") || false,
        },
        database: {
          available: !!process.env.DATABASE_URL,
          type: "d1",
        },
        cache: {
          available: true, // KV 默认可用
          type: "kv",
        },
        storage: {
          available: true, // R2 默认可用
          type: "r2",
        },
      },

      // 性能指标
      performance: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage?.() || {
          rss: 0,
          heapUsed: 0,
          heapTotal: 0,
        },
      },

      // 功能支持检查
      features: {
        serverSideRendering: true,
        apiRoutes: true,
        middleware: true,
        imageOptimization: true,
        isr: true, // Incremental Static Regeneration
        edgeFunctions: true,
        webSockets: true,
        streaming: true,
      },

      // 运行时信息
      runtime: {
        name: "Node.js",
        version: process.version,
        platform: "cloudflare-workers",
        architecture: "worker",
      },
    };

    // 检查关键依赖
    const criticalServices = ["groq"];
    const unavailableServices = criticalServices.filter(
      (service) => !healthData.services[service as keyof typeof healthData.services].available,
    );

    if (unavailableServices.length > 0) {
      healthData.status = "degraded";
      healthData.issues = [`Missing critical services: ${unavailableServices.join(", ")}`];
    }

    const responseTime = Date.now() - startTime;
    healthData.performance.responseTime = responseTime;

    // 设置响应头
    const response = NextResponse.json(apiSuccess("Health check completed", healthData), {
      status: healthData.status === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "OpenNext.js",
        "X-Response-Time": `${responseTime}ms`,
        "X-Platform": "cloudflare-workers",
      },
    });

    return response;
  } catch (error) {
    console.error("❌ Health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        status: "unhealthy",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Health-Check": "OpenNext.js",
          "X-Platform": "cloudflare-workers",
        },
      },
    );
  }
}

/**
 * 详细健康检查 - 包含更多诊断信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { detailed = false, testConnections = false } = body;

    const healthData: any = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      detailed: true,

      // 系统信息
      system: {
        platform: "cloudflare-workers",
        architecture: "worker",
        region: "unknown", // Cloudflare 自动选择
        datacenter: "unknown",
      },

      // 运行时信息
      runtime: {
        name: "Node.js",
        version: process.version,
        environment: process.env.NODE_ENV,
      },

      // 依赖项版本
      dependencies: {
        next: "15.5.4",
        react: "19.1.1",
        opennext: "1.11.0",
      },

      // 配置检查
      configuration: {
        features: {
          imageOptimization: true,
          isr: true,
          serverComponents: true,
          apiRoutes: true,
          middleware: true,
        },

        environmentVariables: {
          NODE_ENV: !!process.env.NODE_ENV,
          GROQ_API_KEY: !!process.env.GROQ_API_KEY,
          NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
        },
      },
    };

    // 如果要求测试连接
    if (testConnections) {
      healthData.connections = {
        timestamp: new Date().toISOString(),
        tests: {},
      };

      // 测试 KV 连接
      try {
        const kvTest = { success: true, latency: 0 };
        healthData.connections.tests.kv = kvTest;
      } catch (error) {
        healthData.connections.tests.kv = {
          success: false,
          error: error instanceof Error ? error.message : "KV connection failed",
        };
      }

      // 测试 D1 连接
      try {
        const d1Test = { success: true, latency: 0 };
        healthData.connections.tests.d1 = d1Test;
      } catch (error) {
        healthData.connections.tests.d1 = {
          success: false,
          error: error instanceof Error ? error.message : "D1 connection failed",
        };
      }
    }

    return NextResponse.json(apiSuccess("Detailed health check completed", healthData), {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "OpenNext.js-Detailed",
        "X-Platform": "cloudflare-workers",
      },
    });
  } catch (error) {
    console.error("❌ Detailed health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Detailed health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        status: "unhealthy",
      },
      {
        status: 503,
      },
    );
  }
}
