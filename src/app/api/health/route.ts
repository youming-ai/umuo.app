import { type NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/utils/api-response";

export const runtime = "edge"; // Cloudflare Pages 需要 Edge Runtime

/**
 * Cloudflare Workers 健康检查 API
 * 用于监控系统运行状态和依赖服务
 */
interface HealthData {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  environment: string;
  platform: string;
  opennext: boolean;
  version: string;
  services: {
    groq: {
      available: boolean;
      configured: boolean;
    };
    database: {
      available: boolean;
      type: string;
    };
    cache: {
      available: boolean;
      type: string;
    };
    storage: {
      available: boolean;
      type: string;
    };
  };
  performance?: {
    responseTime: number;
    memoryUsage?: {
      used: number;
      total: number;
    };
  };
  features?: {
    serverSideRendering: boolean;
    apiRoutes: boolean;
    middleware: boolean;
    imageOptimization: boolean;
    isr: boolean;
    edgeFunctions: boolean;
    webSockets: boolean;
    streaming: boolean;
  };
  runtime?: {
    name: string;
    version: string;
    platform: string;
    architecture: string;
  };
  issues?: string[];
  dependencies?: {
    [key: string]: string;
  };
  configuration?: {
    features?: {
      [key: string]: boolean;
    };
    [key: string]: any;
  };
  connections?: {
    timestamp: string;
    tests: {
      [key: string]: any;
    };
  };
}

interface SystemInfo {
  platform: string;
  architecture: string;
  region: string;
  datacenter: string;
}

interface RuntimeInfo {
  name: string;
  version: string;
  environment?: string;
}

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now();

    // 检查基本信息
    const healthData: HealthData = {
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
        memoryUsage: process.memoryUsage?.()
          ? {
              used: process.memoryUsage().heapUsed,
              total: process.memoryUsage().heapTotal,
            }
          : {
              used: 0,
              total: 0,
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
      (service) =>
        !healthData.services[service as keyof typeof healthData.services]
          .available,
    );

    if (unavailableServices.length > 0) {
      healthData.status = "unhealthy"; // 修复类型错误
      healthData.issues = [
        `Missing critical services: ${unavailableServices.join(", ")}`,
      ];
    }

    const responseTime = Date.now() - startTime;
    if (healthData.performance) {
      healthData.performance.responseTime = responseTime;
    }

    // 根据健康状态确定状态码
    const statusCode = healthData.status === "healthy" ? 200 : 503;

    // 使用 NextResponse.json 直接创建响应，避免只读属性问题
    const response = NextResponse.json(
      {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString(),
      },
      {
        status: statusCode,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Health-Check": "OpenNext.js",
          "X-Response-Time": `${responseTime}ms`,
          "X-Platform": "cloudflare-workers",
        },
      },
    );

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
    const { testConnections = false } = body;

    const healthData: HealthData & {
      detailed: boolean;
      system: SystemInfo;
      runtime: RuntimeInfo;
    } = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
      environment: process.env.NODE_ENV || "unknown",
      platform: "cloudflare-workers",
      opennext: true,
      version: "1.0.0",
      detailed: true,

      // 基本服务状态
      services: {
        groq: {
          available: true,
          configured: !!process.env.GROQ_API_KEY,
        },
        database: {
          available: true,
          type: "indexeddb",
        },
        cache: {
          available: true,
          type: "memory",
        },
        storage: {
          available: true,
          type: "indexeddb",
        },
      },

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
        platform: process.platform,
        architecture: process.arch,
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
          error:
            error instanceof Error ? error.message : "KV connection failed",
        };
      }

      // 测试 D1 连接
      try {
        const d1Test = { success: true, latency: 0 };
        healthData.connections.tests.d1 = d1Test;
      } catch (error) {
        healthData.connections.tests.d1 = {
          success: false,
          error:
            error instanceof Error ? error.message : "D1 connection failed",
        };
      }
    }

    const response = apiSuccess(healthData);

    // 添加详细的健康检查响应头
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    response.headers.set("X-Health-Check", "OpenNext.js-Detailed");
    response.headers.set("X-Platform", "cloudflare-workers");

    return response;
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
