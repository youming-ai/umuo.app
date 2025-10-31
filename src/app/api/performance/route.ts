/**
 * 性能指标收集API
 * 用于接收和存储客户端性能数据
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/utils/api-response";

export const runtime = "edge"; // Cloudflare Pages 需要 Edge Runtime

// 内存存储性能数据（生产环境应使用数据库或外部服务）
const performanceStore = new Map<string, any[]>();

// 性能数据接口
interface PerformanceData {
  metrics: Record<string, any>;
  url: string;
  timestamp: number;
  userAgent: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: PerformanceData = await request.json();

    // 验证数据格式
    if (!data.metrics || !data.timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid performance data format",
        },
        { status: 400 }
      );
    }

    // 生成会话ID（基于时间戳和用户代理的简单哈希）
    const sessionId = generateSessionId(data.userAgent);
    data.sessionId = sessionId;

    // 存储性能数据
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (!performanceStore.has(dateKey)) {
      performanceStore.set(dateKey, []);
    }

    const dailyData = performanceStore.get(dateKey)!;
    dailyData.push({
      ...data,
      receivedAt: Date.now()
    });

    // 保持最近1000条记录
    if (dailyData.length > 1000) {
      dailyData.splice(0, dailyData.length - 1000);
    }

    // 检测性能问题
    const issues = detectPerformanceIssues(data.metrics);

    // 异步处理数据（不阻塞响应）
    processPerformanceData(data, issues).catch(error => {
      console.error("Failed to process performance data:", error);
    });

    return apiSuccess({
      received: true,
      sessionId,
      issues: issues.length > 0 ? issues : undefined
    });

  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process performance data",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0];
    const sessionId = searchParams.get("session");

    let data: any[] = [];

    if (sessionId) {
      // 获取特定会话的数据
      for (const [dateKey, dailyData] of performanceStore.entries()) {
        const sessionData = dailyData.filter(item => item.sessionId === sessionId);
        data.push(...sessionData);
      }
    } else {
      // 获取特定日期的数据
      data = performanceStore.get(date) || [];
    }

    // 计算统计数据
    const stats = calculatePerformanceStats(data);

    return apiSuccess({
      date,
      sessionId: sessionId || undefined,
      totalRecords: data.length,
      stats,
      recentData: data.slice(-10) // 最近10条记录
    });

  } catch (error) {
    console.error("Performance GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve performance data",
      },
      { status: 500 }
    );
  }
}

// 生成会话ID
function generateSessionId(userAgent: string): string {
  const timestamp = Date.now().toString();
  const hash = simpleHash(userAgent + timestamp);
  return `session_${hash}`;
}

// 简单哈希函数
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}

// 检测性能问题
function detectPerformanceIssues(metrics: Record<string, any>): string[] {
  const issues: string[] = [];

  // Core Web Vitals 阈值
  if (metrics.fcp > 2500) {
    issues.push(`FCP 过慢: ${Math.round(metrics.fcp)}ms`);
  }

  if (metrics.lcp > 4000) {
    issues.push(`LCP 过慢: ${Math.round(metrics.lcp)}ms`);
  }

  if (metrics.fid > 300) {
    issues.push(`FID 过慢: ${Math.round(metrics.fid)}ms`);
  }

  if (metrics.cls > 0.25) {
    issues.push(`CLS 过高: ${metrics.cls.toFixed(3)}`);
  }

  // 自定义指标阈值
  if (metrics.transcriptionTime > 60000) {
    issues.push(`转录时间过长: ${Math.round(metrics.transcriptionTime / 1000)}秒`);
  }

  if (metrics.uploadTime > 30000) {
    issues.push(`上传时间过长: ${Math.round(metrics.uploadTime / 1000)}秒`);
  }

  if (metrics.apiResponseTime > 5000) {
    issues.push(`API响应时间过长: ${Math.round(metrics.apiResponseTime)}ms`);
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) {
    issues.push(`内存使用过高: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`);
  }

  if (metrics.errorCount > 5) {
    issues.push(`错误次数过多: ${metrics.errorCount}次`);
  }

  return issues;
}

// 计算性能统计数据
function calculatePerformanceStats(data: any[]): any {
  if (data.length === 0) {
    return null;
  }

  // Core Web Vitals 统计
  const fcpValues = data.filter(d => d.metrics.fcp).map(d => d.metrics.fcp);
  const lcpValues = data.filter(d => d.metrics.lcp).map(d => d.metrics.lcp);
  const fidValues = data.filter(d => d.metrics.fid).map(d => d.metrics.fid);
  const clsValues = data.filter(d => d.metrics.cls).map(d => d.metrics.cls);

  // 自定义指标统计
  const transcriptionTimes = data.filter(d => d.metrics.transcriptionTime).map(d => d.metrics.transcriptionTime);
  const uploadTimes = data.filter(d => d.metrics.uploadTime).map(d => d.metrics.uploadTime);
  const apiResponseTimes = data.filter(d => d.metrics.apiResponseTime).map(d => d.metrics.apiResponseTime);

  return {
    coreWebVitals: {
      fcp: calculatePercentiles(fcpValues),
      lcp: calculatePercentiles(lcpValues),
      fid: calculatePercentiles(fidValues),
      cls: calculatePercentiles(clsValues),
    },
    customMetrics: {
      transcriptionTime: calculatePercentiles(transcriptionTimes),
      uploadTime: calculatePercentiles(uploadTimes),
      apiResponseTime: calculatePercentiles(apiResponseTimes),
    },
    errors: {
      totalErrors: data.reduce((sum, d) => sum + (d.metrics.errorCount || 0), 0),
      totalCrashes: data.reduce((sum, d) => sum + (d.metrics.crashCount || 0), 0),
    },
    sessions: {
      uniqueSessions: new Set(data.map(d => d.sessionId)).size,
      averageSessionLength: calculateAverageSessionLength(data),
    }
  };
}

// 计算百分位数
function calculatePercentiles(values: number[]): any {
  if (values.length === 0) return null;

  const sorted = values.sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)],
    p75: sorted[Math.floor(len * 0.75)],
    p90: sorted[Math.floor(len * 0.9)],
    p95: sorted[Math.floor(len * 0.95)],
    avg: sorted.reduce((sum, val) => sum + val, 0) / len,
    min: sorted[0],
    max: sorted[len - 1],
  };
}

// 计算平均会话长度
function calculateAverageSessionLength(data: any[]): number {
  const sessionLengths = new Map<string, number[]>();

  data.forEach(item => {
    const sessionId = item.sessionId;
    const timestamp = item.timestamp;

    if (!sessionLengths.has(sessionId)) {
      sessionLengths.set(sessionId, []);
    }
    sessionLengths.get(sessionId)!.push(timestamp);
  });

  let totalLength = 0;
  let sessionCount = 0;

  for (const timestamps of sessionLengths.values()) {
    if (timestamps.length > 1) {
      const sessionLength = Math.max(...timestamps) - Math.min(...timestamps);
      totalLength += sessionLength;
      sessionCount++;
    }
  }

  return sessionCount > 0 ? totalLength / sessionCount : 0;
}

// 异步处理性能数据
async function processPerformanceData(data: PerformanceData, issues: string[]): Promise<void> {
  // 这里可以添加：
  // 1. 发送到外部监控服务（如 Sentry, DataDog 等）
  // 2. 存储到数据库
  // 3. 生成告警
  // 4. 数据分析和报告

  // 示例：记录严重性能问题
  if (issues.length > 0) {
    console.warn("Performance issues detected:", {
      url: data.url,
      sessionId: data.sessionId,
      issues,
      metrics: data.metrics
    });
  }

  // 示例：发送到外部服务（需要配置）
  // if (process.env.MONITORING_WEBHOOK) {
  //   await fetch(process.env.MONITORING_WEBHOOK, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ data, issues })
  //   });
  // }
}
